import type { SummonPoolSystem } from './SummonPoolSystem';

export interface BuildableTile {
	readonly col: number;
	readonly row: number;
}

export interface SummonPlacementContext {
	listBuildableTiles(): readonly BuildableTile[];
	isOccupied(col: number, row: number): boolean;
}

export type SummonRequestResult =
	| {
			kind: 'success';
			col: number;
			row: number;
			towerId: string;
	  }
	| {
			kind: 'failed';
			reason: 'no-empty-tile';
	  };

export class RandomSummonSystem {
	constructor(
		private readonly pool: SummonPoolSystem,
		private readonly placementRng: () => number = Math.random,
	) {}

	requestSummon(ctx: SummonPlacementContext): SummonRequestResult {
		const empty = ctx
			.listBuildableTiles()
			.filter((t) => !ctx.isOccupied(t.col, t.row));
		if (empty.length === 0) {
			return { kind: 'failed', reason: 'no-empty-tile' };
		}
		const idx = Math.min(
			Math.floor(this.placementRng() * empty.length),
			empty.length - 1,
		);
		const tile = empty[idx];
		const draw = this.pool.draw();
		return {
			kind: 'success',
			col: tile.col,
			row: tile.row,
			towerId: draw.towerId,
		};
	}
}
