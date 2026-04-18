import {
	PHASE_A_SUMMON_COST,
	pickRandomUpgrades,
	type TowerId,
	UPGRADE_CARDS,
	type UpgradeCard,
	type UpgradeId,
} from '@gld/shared';

const UPGRADE_CARD_MAP: ReadonlyMap<string, UpgradeCard> = new Map(
	UPGRADE_CARDS.map((c) => [c.id, c]),
);

import { EventBus } from '../EventBus';
import { GachaSystem } from './GachaSystem';
import { MergeSystem } from './MergeSystem';
import { SummonPoolSystem } from './SummonPoolSystem';
import type { TowerSystem } from './TowerSystem';

/**
 * A staged summon waiting for the player to tap a placement tile. Queue
 * entries carry `energyRefund` — the amount to restore if the summon is
 * cancelled. Gacha summons spend energy at enqueue time (refund = cost);
 * regular pool summons defer spend to placement (refund = 0).
 */
interface PendingSummonRequest {
	requestId: string;
	towerId: TowerId;
	source: 'summon' | 'gacha';
	energyRefund: number;
}

function makeRequestId(): string {
	const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
	if (c?.randomUUID) return c.randomUUID();
	return `sum_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Minimal energy-system surface the orchestrator needs. Structural so we
 *  don't import EnergySystem and can swap in a fake in tests. */
export interface PhaseAEnergyApi {
	canAfford(cost: number): boolean;
	spend(cost: number): boolean;
	add(amount: number): void;
}

/** Phase 10 BM stub surface. Kept minimal here so compilation stays stable
 *  without pulling in the full AdService contract — Phase 10 will wire the
 *  real service. Return `'rewarded'` on success, anything else = not rewarded. */
export interface PhaseAAdServiceApi {
	watchAd?(placement: string): Promise<'rewarded' | 'dismissed' | 'failed'>;
}

export interface PhaseAOrchestratorDeps {
	towerSystem: TowerSystem;
	initialPool: readonly string[];
	rng?: () => number;
	energySystem?: PhaseAEnergyApi;
	summonCost?: number;
	adService?: PhaseAAdServiceApi;
}

/**
 * Cap on any individual upgrade stack (plan §DRIFT [F17]). Keeps the gacha
 * tier-odds card from compounding into a guaranteed roll and prevents
 * runaway multiplicative damage at pathological stack counts.
 */
export const UPGRADE_MAX_STACKS = 10;

/**
 * Phase A pivot wiring. Owns SummonPoolSystem + MergeSystem and bridges
 * them to TowerSystem via EventBus.
 *
 * Phase 4 adds roguelike stack tracking (capped at `UPGRADE_MAX_STACKS`)
 * plus accessors for each card's runtime effect. Damage / crit / energy
 * tick / effect-amp / tier-odds are consumed by the relevant systems via
 * the `getModifier` + dedicated getters below.
 */
export class PhaseAOrchestrator {
	private readonly summonPool: SummonPoolSystem;
	private readonly summonCost: number;
	private readonly rng: () => number;
	private pendingSummon: PendingSummonRequest | null = null;
	private summonQueue: PendingSummonRequest[] = [];
	private destroyed = false;
	private activeUpgrades: Map<UpgradeId, number> = new Map();
	private energyRegenTimer = 0;
	private pendingChoices: UpgradeCard[] | null = null;

	private readonly onSummonRequest = (): void => this.handleSummonRequest();
	private readonly onGachaRequest = (data: { targetTier: 2 | 3 | 4 }): void =>
		this.handleGachaRequest(data);
	private readonly onMergeRequest = (data: {
		fromCol: number;
		fromRow: number;
		toCol: number;
		toRow: number;
	}): void => this.handleMergeRequest(data);
	private readonly onClearSelection = (): void => {
		// Do NOT clear pendingSummon here — preserving the drawn tower
		// prevents reroll exploit (cancel → re-summon → different tower).
	};
	private readonly onApplyUpgrade = (data: { upgradeId: string }): void =>
		this.applyUpgrade(data.upgradeId);
	private readonly onRerollRequest = (): void => {
		void this.handleRerollRequest();
	};

	constructor(private readonly deps: PhaseAOrchestratorDeps) {
		this.summonPool = new SummonPoolSystem(deps.initialPool, deps.rng);
		this.summonCost = deps.summonCost ?? PHASE_A_SUMMON_COST;
		this.rng = deps.rng ?? Math.random;

		EventBus.off('request-summon-tower', this.onSummonRequest);
		EventBus.on('request-summon-tower', this.onSummonRequest);
		EventBus.off('request-gacha-summon', this.onGachaRequest);
		EventBus.on('request-gacha-summon', this.onGachaRequest);
		EventBus.off('request-merge-towers', this.onMergeRequest);
		EventBus.on('request-merge-towers', this.onMergeRequest);
		EventBus.off('request-clear-tower-selection', this.onClearSelection);
		EventBus.on('request-clear-tower-selection', this.onClearSelection);
		EventBus.off('request-apply-upgrade', this.onApplyUpgrade);
		EventBus.on('request-apply-upgrade', this.onApplyUpgrade);
		EventBus.off('request-upgrade-reroll', this.onRerollRequest);
		EventBus.on('request-upgrade-reroll', this.onRerollRequest);
	}

	getSummonPool(): SummonPoolSystem {
		return this.summonPool;
	}

	destroy(): void {
		if (this.destroyed) return;
		this.destroyed = true;
		EventBus.off('request-summon-tower', this.onSummonRequest);
		EventBus.off('request-gacha-summon', this.onGachaRequest);
		EventBus.off('request-merge-towers', this.onMergeRequest);
		EventBus.off('request-clear-tower-selection', this.onClearSelection);
		EventBus.off('request-apply-upgrade', this.onApplyUpgrade);
		EventBus.off('request-upgrade-reroll', this.onRerollRequest);
	}

	hasPendingSummon(): boolean {
		return this.pendingSummon !== null;
	}

	/** Test/diagnostic helper — surfaces the queue length without exposing
	 *  the internal array reference. */
	getSummonQueueSize(): number {
		return this.summonQueue.length;
	}

	cancelPendingSummon(): void {
		this.settlePendingSummon('cancelled');
	}

	applyUpgrade(upgradeId: string): void {
		if (!UPGRADE_CARD_MAP.has(upgradeId)) return;
		const id = upgradeId as UpgradeId;
		const prev = this.activeUpgrades.get(id) ?? 0;
		const next = Math.min(prev + 1, UPGRADE_MAX_STACKS);
		this.activeUpgrades.set(id, next);
		this.pendingChoices = null;
		EventBus.emit('upgrade-applied', { upgradeId, totalStacks: next });
	}

	getUpgradeStacks(upgradeId: string): number {
		if (!UPGRADE_CARD_MAP.has(upgradeId)) return 0;
		return this.activeUpgrades.get(upgradeId as UpgradeId) ?? 0;
	}

	/**
	 * Final modifier for a given upgrade.
	 * - `multiply` → `value ** stackCount` (1 when no stacks)
	 * - `add`      → `value * stackCount`  (0 when no stacks)
	 *
	 * Unknown ids return the multiplicative identity (1) so existing TowerSystem
	 * call-sites that referenced Phase 3 ids (spd_up / range_up) keep working
	 * during the transition — they now just contribute nothing.
	 */
	getModifier(upgradeId: UpgradeId | string): number {
		const card = UPGRADE_CARD_MAP.get(upgradeId);
		const stacks = this.activeUpgrades.get(upgradeId as UpgradeId) ?? 0;
		if (!card) return 1;
		if (stacks === 0) return card.stackType === 'add' ? 0 : 1;
		if (card.stackType === 'multiply') {
			return card.value ** stacks;
		}
		return card.value * stacks;
	}

	/**
	 * `dmg_up` — total damage multiplier (1 + when stacked). TowerSystem
	 * multiplies final damage by this number.
	 */
	getDamageMultiplier(): number {
		return this.getModifier('dmg_up');
	}

	/**
	 * `crit_dmg` — additive crit-damage bonus. No crit system yet; for now
	 * this is surfaced so the damage path can apply it as a flat
	 * multiplicative damage boost when stacks > 0.
	 *
	 * TODO(phase-12): migrate to a proper crit chance+mult system.
	 */
	getCritDamageBonus(): number {
		return this.getModifier('crit_dmg');
	}

	/**
	 * `energy_harvest` — extra energy per kill. Added on top of
	 * `ENERGY_PER_KILL` baseline.
	 */
	getEnergyPerKillBonus(): number {
		return this.getModifier('energy_harvest');
	}

	/**
	 * `effect_amp` — slow/stun duration multiplier. `UnitSystem.applySlow` /
	 * `applyStun` scales the incoming `durationMs` by this value.
	 */
	getEffectDurationMultiplier(): number {
		return this.getModifier('effect_amp');
	}

	/**
	 * `tier_odds_up` — additive success-rate bonus for the Phase 5 GachaSystem.
	 * Capped internally at +0.5 via `UPGRADE_MAX_STACKS * 0.05`. Phase 5 applies
	 * an additional hard clamp so effective rate stays <= 0.95.
	 */
	getTierOddsBonus(): number {
		return this.getModifier('tier_odds_up');
	}

	get effectiveSummonCost(): number {
		// Phase 4: `summon_discount` is gone. Cost is constant until a future
		// card reintroduces it.
		return this.summonCost;
	}

	/**
	 * `energy_regen` tick. Call from the Game scene's `update()` loop with
	 * the current frame delta in seconds. Accumulates an internal timer and
	 * grants `stackCount * amount` energy every `interval` ms.
	 */
	tickEnergyRegen(deltaSec: number): void {
		const stacks = this.getUpgradeStacks('energy_regen');
		if (stacks === 0) return;
		const card = UPGRADE_CARD_MAP.get('energy_regen');
		const intervalSec = (card?.interval ?? 5000) / 1000;
		const amount = card?.amount ?? 2;
		this.energyRegenTimer += deltaSec;
		while (this.energyRegenTimer >= intervalSec) {
			this.energyRegenTimer -= intervalSec;
			this.deps.energySystem?.add(stacks * amount);
		}
	}

	resetUpgrades(): void {
		this.activeUpgrades.clear();
		this.energyRegenTimer = 0;
		this.pendingChoices = null;
	}

	/**
	 * Emit a fresh 3-card upgrade offer. Picks distinct cards deterministically
	 * via the orchestrator's rng so tests can feed a seeded source. Emits
	 * `upgrade-choice-ready` with the `{ choices }` shape registered in the
	 * Task 4.0 event map.
	 */
	requestUpgradePick(count = 3): void {
		const picks = pickRandomUpgrades(count, this.rng);
		this.pendingChoices = picks;
		EventBus.emit('upgrade-choice-ready', {
			choices: picks.map((c) => ({
				id: c.id,
				name: c.name,
				description: c.description,
				icon: c.icon,
			})),
		});
	}

	/**
	 * Ad-rewarded reroll. If an adService is wired, watch an ad; otherwise
	 * (early dev, tests) auto-grant the reroll and log a warning so we see
	 * it until Phase 10 lands. On success, emit a fresh `upgrade-choice-ready`
	 * with a new distinct pick.
	 */
	private async handleRerollRequest(): Promise<void> {
		const adService = this.deps.adService;
		let rewarded = true;
		if (adService?.watchAd) {
			const result = await adService.watchAd('reroll');
			rewarded = result === 'rewarded';
		} else {
			console.warn(
				'[PhaseAOrchestrator] request-upgrade-reroll without adService; granting reroll (Phase 10 will wire real ad).',
			);
		}
		if (!rewarded) return;
		this.requestUpgradePick(this.pendingChoices?.length ?? 3);
	}

	completePlacement(col: number, row: number): void {
		const pending = this.pendingSummon;
		if (!pending) return;

		// Gacha summons pay their cost at enqueue time (tracked as
		// `energyRefund`). Pool summons defer spend until placement to keep
		// legacy behaviour and let a cancelled tap not burn energy.
		const paidUpfront = pending.energyRefund > 0;
		const deferredCost = paidUpfront ? 0 : this.effectiveSummonCost;

		if (
			!paidUpfront &&
			this.deps.energySystem &&
			!this.deps.energySystem.spend(deferredCost)
		) {
			EventBus.emit('summon-failed', { reason: 'insufficient-energy' });
			// The draw stays pending so the player can retry after topping up
			// energy — matches pre-Phase-5 behaviour.
			return;
		}

		const placement = this.deps.towerSystem.placeTower(
			col,
			row,
			pending.towerId,
			{
				levelOverride: 1,
			},
		);

		if (!placement.success) {
			// Refund whichever cost was charged: the deferred spend just above
			// (pool) or the upfront refund recorded on the queue entry (gacha).
			const refund = paidUpfront ? pending.energyRefund : deferredCost;
			if (refund > 0) this.deps.energySystem?.add(refund);
			// Drop the pending draw so a failed placement doesn't strand the
			// queue. This mirrors the cancellation path (queue advances).
			this.settlePendingSummon('cancelled-no-refund');
			EventBus.emit('summon-failed', { reason: 'placement-failed' });
			return;
		}
		this.deps.towerSystem.playPhaseASummonVfx(col, row);

		// Task 4.0 [F7]: emit the family/tier payload (grade is gone). The
		// placed tower record is the source of truth for instanceId; tier
		// comes via getTowerAt which reads the authoritative TowerInstance.
		const placed = this.deps.towerSystem.getTowerAt(col, row);
		EventBus.emit('tower-summoned', {
			col,
			row,
			towerId: pending.towerId as TowerId,
			instanceId: placed?.data.instanceId ?? '',
			tier: placed?.tier ?? 1,
		});

		// Task 5.6 [F8]: advance the summon queue. No refund — the tower was
		// placed successfully.
		this.settlePendingSummon('placed');
	}

	private handleSummonRequest(): void {
		const energy = this.deps.energySystem;
		if (energy && !energy.canAfford(this.effectiveSummonCost)) {
			EventBus.emit('summon-failed', { reason: 'insufficient-energy' });
			return;
		}

		// Preserve Phase 3 behaviour: re-tapping summon while a pool draw is
		// already pending re-emits the same tower (no reroll exploit, no
		// double-queueing). Only the gacha path enqueues concurrently.
		if (this.pendingSummon && this.pendingSummon.source === 'summon') {
			EventBus.emit('phase-a-summon-ready', {
				towerId: this.pendingSummon.towerId,
				source: 'summon',
			});
			return;
		}

		const draw = this.summonPool.draw();
		this.enqueueSummon({
			towerId: draw.towerId as TowerId,
			source: 'summon',
			energyRefund: 0,
		});
	}

	/**
	 * Phase 5 handler for `request-gacha-summon`. Charges the tier cost
	 * upfront (so energy is reserved across the queue), rolls a tower via
	 * {@link GachaSystem} with the current `tier_odds_up` bonus, and stages
	 * the draw for placement. Insufficient energy → {@link GameEventMap}
	 * `gacha-insufficient-energy`, no queueing.
	 */
	private handleGachaRequest(data: { targetTier: 2 | 3 | 4 }): void {
		const cost = GachaSystem.getCost(data.targetTier);
		const energy = this.deps.energySystem;
		if (energy && !energy.spend(cost)) {
			EventBus.emit('gacha-insufficient-energy', {
				targetTier: data.targetTier,
				cost,
				have: this.currentEnergy(),
			});
			return;
		}
		const oddsBonus = this.getTierOddsBonus();
		const towerId = GachaSystem.rollTier(data.targetTier, this.rng, oddsBonus);
		this.enqueueSummon({
			towerId,
			source: 'gacha',
			energyRefund: cost,
		});
	}

	private currentEnergy(): number {
		const energy = this.deps.energySystem as
			| (PhaseAEnergyApi & { current?: number })
			| undefined;
		return energy?.current ?? 0;
	}

	private enqueueSummon(req: Omit<PendingSummonRequest, 'requestId'>): void {
		const full: PendingSummonRequest = { ...req, requestId: makeRequestId() };
		if (this.pendingSummon) {
			this.summonQueue.push(full);
			return;
		}
		this.pendingSummon = full;
		EventBus.emit('phase-a-summon-ready', {
			towerId: full.towerId,
			source: full.source,
		});
	}

	/**
	 * Resolve the current pending summon and advance the queue.
	 *
	 * - `placed` → no refund, next queue entry surfaces.
	 * - `cancelled` → refund `energyRefund` (gacha paid upfront; pool was 0).
	 * - `cancelled-no-refund` → placement failed after the caller already
	 *   refunded the charged cost; advance without double-refunding.
	 */
	private settlePendingSummon(
		outcome: 'placed' | 'cancelled' | 'cancelled-no-refund',
	): void {
		const cur = this.pendingSummon;
		this.pendingSummon = null;
		if (cur && outcome === 'cancelled' && cur.energyRefund > 0) {
			this.deps.energySystem?.add(cur.energyRefund);
		}
		const next = this.summonQueue.shift();
		if (next) {
			this.pendingSummon = next;
			EventBus.emit('phase-a-summon-ready', {
				towerId: next.towerId,
				source: next.source,
			});
		}
	}

	private handleMergeRequest(data: {
		fromCol: number;
		fromRow: number;
		toCol: number;
		toRow: number;
	}): void {
		const towerSystem = this.deps.towerSystem;
		const a = towerSystem.getTowerLocator(data.fromCol, data.fromRow);
		const b = towerSystem.getTowerLocator(data.toCol, data.toRow);
		if (!a || !b) {
			EventBus.emit('merge-failed', {
				fromCol: data.fromCol,
				fromRow: data.fromRow,
				toCol: data.toCol,
				toRow: data.toRow,
				reason: 'invalid-tile',
			});
			return;
		}

		const result = MergeSystem.tryMerge(a, b);
		if (result.kind === 'failure') {
			EventBus.emit('merge-failed', {
				fromCol: data.fromCol,
				fromRow: data.fromRow,
				toCol: data.toCol,
				toRow: data.toRow,
				reason: result.reason,
			});
			return;
		}

		// Merge spawns the new tower at the merge target (b = second tap).
		const targetCol = data.toCol;
		const targetRow = data.toRow;
		towerSystem.removeTowerAt(data.fromCol, data.fromRow);
		towerSystem.removeTowerAt(data.toCol, data.toRow);

		const placement = towerSystem.placeTower(
			targetCol,
			targetRow,
			result.toTowerId,
			{ levelOverride: 1 },
		);
		if (!placement.success) {
			// Shouldn't happen — the target tile was just occupied by `b`, so
			// it's clearly buildable. Still guard against pathfinding races.
			EventBus.emit('merge-failed', {
				fromCol: data.fromCol,
				fromRow: data.fromRow,
				toCol: data.toCol,
				toRow: data.toRow,
				reason: 'invalid-tile',
			});
			return;
		}

		towerSystem.playPhaseAMergeVfx(targetCol, targetRow);

		const newLocator = towerSystem.getTowerLocator(targetCol, targetRow);
		EventBus.emit('towers-merged', {
			col: targetCol,
			row: targetRow,
			towerId: result.toTowerId,
			fromA: result.consumedA,
			fromB: result.consumedB,
			toInstanceId: newLocator?.instanceId ?? placement.tower.instanceId,
			toTowerId: result.toTowerId,
			fromTier: a.tier,
			toTier: result.toTier,
		});
	}
}
