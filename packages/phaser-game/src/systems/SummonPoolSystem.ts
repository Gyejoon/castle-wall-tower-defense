import {
	createSummonPool,
	drawRandomSummon,
	type SummonPool,
	type SummonResult,
} from '@gld/shared';

export class SummonPoolSystem {
	private readonly initial: readonly string[];
	private pool: SummonPool;

	constructor(
		initialTowerIds: readonly string[],
		private readonly rng: () => number = Math.random,
	) {
		this.initial = [...initialTowerIds];
		this.pool = createSummonPool(initialTowerIds);
	}

	getPool(): SummonPool {
		return this.pool;
	}

	draw(): SummonResult {
		return drawRandomSummon(this.pool, this.rng);
	}

	replacePool(towerIds: readonly string[]): void {
		this.pool = createSummonPool(towerIds);
	}

	/**
	 * Restore the pool to the IDs passed at construction time, ignoring any
	 * later replacePool() calls. Use this on run restart, not for "undo last
	 * pool change". If you need a new baseline, construct a new system.
	 */
	reset(): void {
		this.pool = createSummonPool(this.initial);
	}
}
