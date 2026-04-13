import type { Position } from '@gld/shared';
import { EventBus } from '../EventBus';
import type { GridManager } from './GridManager';
import {
	type MergeContext,
	type MergeFailReason,
	MergeSystem,
} from './MergeSystem';
import {
	RandomSummonSystem,
	type SummonPlacementContext,
} from './RandomSummonSystem';
import { SummonPoolSystem } from './SummonPoolSystem';
import type { TowerSystem } from './TowerSystem';

export interface PhaseAOrchestratorDeps {
	towerSystem: TowerSystem;
	gridManager: GridManager;
	buildablePoints: readonly Position[];
	initialPool: readonly string[];
	rng?: () => number;
}

/**
 * Phase A pivot wiring. Owns the three new pure-data systems
 * (SummonPoolSystem, RandomSummonSystem, MergeSystem), bridges them to
 * the existing TowerSystem + GridManager via small adapters, and listens
 * on EventBus for `request-summon-tower` / `request-merge-towers`. On
 * success it calls into TowerSystem and emits the corresponding
 * `tower-summoned` / `towers-merged` events; on failure it emits
 * `merge-failed`.
 *
 * Construction auto-registers the listeners. Call destroy() before the
 * scene shuts down to avoid duplicate registrations on re-mount.
 */
export class PhaseAOrchestrator {
	private readonly summonPool: SummonPoolSystem;
	private readonly summoner: RandomSummonSystem;
	private readonly merger: MergeSystem;
	private readonly summonContext: SummonPlacementContext;
	private readonly mergeContext: MergeContext;
	private destroyed = false;

	private readonly onSummonRequest = (): void => this.handleSummonRequest();
	private readonly onMergeRequest = (data: {
		fromCol: number;
		fromRow: number;
		toCol: number;
		toRow: number;
	}): void => this.handleMergeRequest(data);

	constructor(private readonly deps: PhaseAOrchestratorDeps) {
		this.summonPool = new SummonPoolSystem(deps.initialPool, deps.rng);
		this.summoner = new RandomSummonSystem(this.summonPool, deps.rng);
		this.merger = new MergeSystem();

		const buildable = deps.buildablePoints.map((p) => ({
			col: p.x,
			row: p.y,
		}));
		this.summonContext = {
			listBuildableTiles: () => buildable,
			isOccupied: (col, row) =>
				deps.gridManager.getTile(col, row)?.occupied === true,
		};
		this.mergeContext = {
			getTowerAt: (col, row) => deps.towerSystem.getTowerLocator(col, row),
		};

		EventBus.on('request-summon-tower', this.onSummonRequest);
		EventBus.on('request-merge-towers', this.onMergeRequest);
	}

	getSummonPool(): SummonPoolSystem {
		return this.summonPool;
	}

	destroy(): void {
		if (this.destroyed) return;
		this.destroyed = true;
		EventBus.off('request-summon-tower', this.onSummonRequest);
		EventBus.off('request-merge-towers', this.onMergeRequest);
	}

	private handleSummonRequest(): void {
		const result = this.summoner.requestSummon(this.summonContext);
		if (result.kind === 'failed') {
			return;
		}

		const placement = this.deps.towerSystem.placeTower(
			result.col,
			result.row,
			result.towerId,
			{ gradeOverride: result.grade, levelOverride: 1 },
		);

		if (!placement.success) {
			return;
		}

		EventBus.emit('tower-summoned', {
			col: result.col,
			row: result.row,
			towerId: result.towerId,
			grade: result.grade,
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
				kind: 'failed',
				fromCol: data.fromCol,
				fromRow: data.fromRow,
				toCol: data.toCol,
				toRow: data.toRow,
				reason: 'invalid-tile',
			});
			return;
		}

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
