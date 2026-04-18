/**
 * Phase 1 stub — MergeSystem is being rewritten for the family/tier model in
 * Phase 2 (see docs/superpowers/plans/2026-04-17-phase-a-sole-mode.md). For
 * now this just makes the codebase compile: `tryMerge` returns a not-
 * implemented failure so the existing PhaseAOrchestrator wiring still
 * surfaces a merge-failed event instead of crashing.
 */

export interface TowerLocator {
	readonly col: number;
	readonly row: number;
	readonly towerId: string;
	readonly tier: number;
}

export interface MergeContext {
	getTowerAt(col: number, row: number): TowerLocator | null;
}

export type MergeFailReason =
	| 'not-implemented'
	| 'different-tower'
	| 'different-tier'
	| 'max-tier'
	| 'invalid-tile';

export type MergeResult =
	| {
			kind: 'success';
			keptCol: number;
			keptRow: number;
			removedCol: number;
			removedRow: number;
			resultTowerId: string;
			resultTier: number;
	  }
	| {
			kind: 'failed';
			fromCol: number;
			fromRow: number;
			toCol: number;
			toRow: number;
			reason: MergeFailReason;
	  };

export class MergeSystem {
	tryMerge(
		_ctx: MergeContext,
		fromCol: number,
		fromRow: number,
		toCol: number,
		toRow: number,
	): MergeResult {
		return {
			kind: 'failed',
			fromCol,
			fromRow,
			toCol,
			toRow,
			reason: 'not-implemented',
		};
	}
}
