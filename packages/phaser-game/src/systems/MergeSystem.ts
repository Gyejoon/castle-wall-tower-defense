import { type Grade, nextGrade } from '@gld/shared';

export interface TowerLocator {
	readonly col: number;
	readonly row: number;
	readonly towerId: string;
	readonly grade: Grade;
}

export interface MergeContext {
	getTowerAt(col: number, row: number): TowerLocator | null;
}

export type MergeResult =
	| {
			kind: 'success';
			keptCol: number;
			keptRow: number;
			removedCol: number;
			removedRow: number;
			towerId: string;
			fromGrade: Grade;
			toGrade: Grade;
	  }
	| {
			kind: 'failed';
			reason:
				| 'different-tower'
				| 'different-grade'
				| 'max-grade'
				| 'invalid-tile';
	  };

export class MergeSystem {
	tryMerge(
		ctx: MergeContext,
		fromCol: number,
		fromRow: number,
		toCol: number,
		toRow: number,
	): MergeResult {
		const from = ctx.getTowerAt(fromCol, fromRow);
		const to = ctx.getTowerAt(toCol, toRow);
		if (!from || !to) {
			return { kind: 'failed', reason: 'invalid-tile' };
		}
		if (from.towerId !== to.towerId) {
			return { kind: 'failed', reason: 'different-tower' };
		}
		if (from.grade !== to.grade) {
			return { kind: 'failed', reason: 'different-grade' };
		}
		const upgraded = nextGrade(from.grade);
		if (!upgraded) {
			return { kind: 'failed', reason: 'max-grade' };
		}
		return {
			kind: 'success',
			keptCol: toCol,
			keptRow: toRow,
			removedCol: fromCol,
			removedRow: fromRow,
			towerId: from.towerId,
			fromGrade: from.grade,
			toGrade: upgraded,
		};
	}
}
