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

	reset(): void {
		this.pool = createSummonPool(this.initial);
	}
}
