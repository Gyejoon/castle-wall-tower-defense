import {
	PHASE_A_SUMMON_COST,
	UPGRADE_CARDS,
	type UpgradeCardDef,
	type UpgradeId,
} from '@gld/shared';

const UPGRADE_CARD_MAP: ReadonlyMap<string, UpgradeCardDef> = new Map(
	UPGRADE_CARDS.map((c) => [c.id, c]),
);

import { EventBus } from '../EventBus';
import { MergeSystem } from './MergeSystem';
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
 * Phase 1: grade is gone — summon yields a towerId only; merge is stubbed
 * and will be rebuilt in Phase 2.
 */
export class PhaseAOrchestrator {
	private readonly summonPool: SummonPoolSystem;
	private readonly summonCost: number;
	private pendingSummon: { towerId: string } | null = null;
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
	private readonly onClearSelection = (): void => {
		// Do NOT clear pendingSummon here — preserving the drawn tower
		// prevents reroll exploit (cancel → re-summon → different tower).
	};
	private readonly onApplyUpgrade = (data: { upgradeId: string }): void =>
		this.applyUpgrade(data.upgradeId);

	constructor(private readonly deps: PhaseAOrchestratorDeps) {
		this.summonPool = new SummonPoolSystem(deps.initialPool, deps.rng);
		this.summonCost = deps.summonCost ?? PHASE_A_SUMMON_COST;

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

	completePlacement(col: number, row: number): void {
		const pending = this.pendingSummon;
		if (!pending) return;
		this.pendingSummon = null;

		const cost = this.effectiveSummonCost;
		if (this.deps.energySystem && !this.deps.energySystem.spend(cost)) {
			EventBus.emit('summon-failed', { reason: 'insufficient-energy' });
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
			this.deps.energySystem?.add(cost);
			EventBus.emit('summon-failed', { reason: 'placement-failed' });
			return;
		}
		this.deps.towerSystem.playPhaseASummonVfx(col, row);

		EventBus.emit('tower-summoned', {
			col,
			row,
			towerId: pending.towerId,
		});
	}

	private handleSummonRequest(): void {
		const energy = this.deps.energySystem;
		if (energy && !energy.canAfford(this.effectiveSummonCost)) {
			EventBus.emit('summon-failed', { reason: 'insufficient-energy' });
			return;
		}

		if (!this.pendingSummon) {
			const draw = this.summonPool.draw();
			this.pendingSummon = { towerId: draw.towerId };
		}

		EventBus.emit('phase-a-summon-ready', {
			towerId: this.pendingSummon.towerId,
		});
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
