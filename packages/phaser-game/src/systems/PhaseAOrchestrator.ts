import {
	type Grade,
	PHASE_A_SUMMON_COST,
	UPGRADE_CARDS,
	type UpgradeCardDef,
	type UpgradeId,
} from '@gld/shared';

const UPGRADE_CARD_MAP: ReadonlyMap<string, UpgradeCardDef> = new Map(
	UPGRADE_CARDS.map((c) => [c.id, c]),
);

import { EventBus } from '../EventBus';
import {
	type MergeContext,
	type MergeFailReason,
	MergeSystem,
} from './MergeSystem';
import { SummonPoolSystem } from './SummonPoolSystem';
import type { TowerSystem } from './TowerSystem';

/** Minimal energy-system surface the orchestrator needs. Structural so we
 *  don't import EnergySystem and can swap in a fake in tests. */
export interface PhaseAEnergyApi {
	canAfford(cost: number): boolean;
	spend(cost: number): boolean;
	add(amount: number): void;
}

export interface PhaseAOrchestratorDeps {
	towerSystem: TowerSystem;
	initialPool: readonly string[];
	rng?: () => number;
	energySystem?: PhaseAEnergyApi;
	summonCost?: number;
}

/**
 * Phase A pivot wiring. Owns SummonPoolSystem + MergeSystem and bridges
 * them to TowerSystem via EventBus.
 *
 * Summon is 2-step: (1) request-summon-tower → pool draw → emit
 * phase-a-summon-ready; (2) Game.ts shows highlights, player taps tile
 * → Game.ts calls completePlacement(col,row) → tower placed.
 *
 * Merge is 1-step: request-merge-towers → MergeSystem validate →
 * TowerSystem.applyMerge → emit towers-merged or merge-failed.
 *
 * Construction auto-registers the listeners. Call destroy() before the
 * scene shuts down to avoid duplicate registrations on re-mount.
 */
export class PhaseAOrchestrator {
	private readonly summonPool: SummonPoolSystem;
	private readonly merger: MergeSystem;
	private readonly mergeContext: MergeContext;
	private readonly summonCost: number;
	private pendingSummon: { towerId: string; grade: Grade } | null = null;
	private destroyed = false;
	private activeUpgrades: Map<string, number> = new Map();
	private energyRegenTimer = 0;

	private readonly onSummonRequest = (): void => this.handleSummonRequest();
	private readonly onMergeRequest = (data: {
		fromCol: number;
		fromRow: number;
		toCol: number;
		toRow: number;
	}): void => this.handleMergeRequest(data);
	private readonly onClearSelection = (): void => this.cancelPendingSummon();
	private readonly onApplyUpgrade = (data: { upgradeId: string }): void =>
		this.applyUpgrade(data.upgradeId);

	constructor(private readonly deps: PhaseAOrchestratorDeps) {
		this.summonPool = new SummonPoolSystem(deps.initialPool, deps.rng);
		this.merger = new MergeSystem();
		this.summonCost = deps.summonCost ?? PHASE_A_SUMMON_COST;

		this.mergeContext = {
			getTowerAt: (col, row) => deps.towerSystem.getTowerLocator(col, row),
		};

		// off() removes THIS instance's ref (no-op on first create).
		// Previous instance's listeners are separate arrow refs; they are
		// cleaned up via destroy() bound to the scene 'shutdown' event.
		// If shutdown was skipped (HMR edge case), stale handlers are
		// guarded by isSceneAlive() in Game.ts.
		EventBus.off('request-summon-tower', this.onSummonRequest);
		EventBus.on('request-summon-tower', this.onSummonRequest);
		EventBus.off('request-merge-towers', this.onMergeRequest);
		EventBus.on('request-merge-towers', this.onMergeRequest);
		EventBus.off('request-clear-tower-selection', this.onClearSelection);
		EventBus.on('request-clear-tower-selection', this.onClearSelection);
		EventBus.off('request-apply-upgrade', this.onApplyUpgrade);
		EventBus.on('request-apply-upgrade', this.onApplyUpgrade);
	}

	getSummonPool(): SummonPoolSystem {
		return this.summonPool;
	}

	destroy(): void {
		if (this.destroyed) return;
		this.destroyed = true;
		EventBus.off('request-summon-tower', this.onSummonRequest);
		EventBus.off('request-merge-towers', this.onMergeRequest);
		EventBus.off('request-clear-tower-selection', this.onClearSelection);
		EventBus.off('request-apply-upgrade', this.onApplyUpgrade);
	}

	hasPendingSummon(): boolean {
		return this.pendingSummon !== null;
	}

	/**
	 * Cancel a pending summon draw. The drawn tower type is NOT "consumed"
	 * from the pool — SummonPoolSystem.draw() is stateless (random pick with
	 * replacement), so canceling and re-drawing just gives another random
	 * pick from the same pool. No resource loss.
	 */
	cancelPendingSummon(): void {
		this.pendingSummon = null;
	}

	applyUpgrade(upgradeId: string): void {
		const prev = this.activeUpgrades.get(upgradeId) ?? 0;
		this.activeUpgrades.set(upgradeId, prev + 1);
		EventBus.emit('upgrade-applied', { upgradeId, totalStacks: prev + 1 });
	}

	getUpgradeStacks(upgradeId: string): number {
		return this.activeUpgrades.get(upgradeId) ?? 0;
	}

	/**
	 * Returns the modifier for a given upgrade type.
	 * For 'multiply' type (dmg_up, spd_up): (1 + baseValue)^stacks
	 * For 'add' type (range_up): stacks * baseValue
	 */
	getModifier(upgradeId: UpgradeId): number {
		const stacks = this.activeUpgrades.get(upgradeId) ?? 0;
		const card = UPGRADE_CARD_MAP.get(upgradeId);
		const isAdditive = card ? card.stackType === 'add' : false;

		if (stacks === 0 || !card) return isAdditive ? 0 : 1;

		if (card.stackType === 'multiply') {
			return (1 + card.baseValue) ** stacks;
		}
		return stacks * card.baseValue;
	}

	get effectiveSummonCost(): number {
		const discount = this.getModifier('summon_discount');
		return Math.max(5, this.summonCost - discount);
	}

	/**
	 * Called from Game.ts update loop. Handles energy_regen timer.
	 * Adds energy every 5 seconds based on energy_regen stacks.
	 */
	tickEnergyRegen(deltaSec: number): void {
		const stacks = this.getUpgradeStacks('energy_regen');
		if (stacks === 0) return;
		this.energyRegenTimer += deltaSec;
		if (this.energyRegenTimer >= 5) {
			this.energyRegenTimer -= 5;
			this.deps.energySystem?.add(stacks);
		}
	}

	resetUpgrades(): void {
		this.activeUpgrades.clear();
		this.energyRegenTimer = 0;
	}

	/**
	 * Step 2: player tapped a buildable tile while a summon is pending.
	 * Place the drawn tower at the chosen position, spend energy, play VFX.
	 */
	completePlacement(col: number, row: number): void {
		const pending = this.pendingSummon;
		if (!pending) return;
		this.pendingSummon = null;

		const placement = this.deps.towerSystem.placeTower(
			col,
			row,
			pending.towerId,
			{
				gradeOverride: pending.grade,
				levelOverride: 1,
			},
		);

		if (!placement.success) {
			EventBus.emit('summon-failed', { reason: 'placement-failed' });
			return;
		}

		this.deps.energySystem?.spend(this.effectiveSummonCost);
		this.deps.towerSystem.playPhaseASummonVfx(col, row);

		EventBus.emit('tower-summoned', {
			col,
			row,
			towerId: pending.towerId,
			grade: pending.grade,
		});
	}

	/**
	 * Step 1: draw a random tower from the pool and enter "placement pending"
	 * mode. Game.ts shows buildable highlights; player taps a tile to place.
	 */
	private handleSummonRequest(): void {
		if (this.pendingSummon) return;

		const energy = this.deps.energySystem;
		if (energy && !energy.canAfford(this.effectiveSummonCost)) {
			EventBus.emit('summon-failed', { reason: 'insufficient-energy' });
			return;
		}

		const draw = this.summonPool.draw();
		this.pendingSummon = { towerId: draw.towerId, grade: draw.grade };

		EventBus.emit('phase-a-summon-ready', {
			towerId: draw.towerId,
			grade: draw.grade,
		});
	}

	private handleMergeRequest(data: {
		fromCol: number;
		fromRow: number;
		toCol: number;
		toRow: number;
	}): void {
		const result = this.merger.tryMerge(
			this.mergeContext,
			data.fromCol,
			data.fromRow,
			data.toCol,
			data.toRow,
		);

		if (result.kind === 'failed') {
			this.emitMergeFailed(result);
			return;
		}

		const ok = this.deps.towerSystem.applyMerge(
			result.removedCol,
			result.removedRow,
			result.keptCol,
			result.keptRow,
			result.toGrade,
		);

		if (!ok) {
			this.emitMergeFailed({
				fromCol: data.fromCol,
				fromRow: data.fromRow,
				toCol: data.toCol,
				toRow: data.toRow,
				reason: 'invalid-tile',
			});
			return;
		}

		this.deps.towerSystem.playPhaseAMergeVfx(result.keptCol, result.keptRow);

		EventBus.emit('towers-merged', {
			col: result.keptCol,
			row: result.keptRow,
			towerId: result.towerId,
			fromGrade: result.fromGrade,
			toGrade: result.toGrade,
		});
	}

	private emitMergeFailed(failure: {
		fromCol: number;
		fromRow: number;
		toCol: number;
		toRow: number;
		reason: MergeFailReason;
	}): void {
		EventBus.emit('merge-failed', {
			fromCol: failure.fromCol,
			fromRow: failure.fromRow,
			toCol: failure.toCol,
			toRow: failure.toRow,
			reason: failure.reason,
		});
	}
}
