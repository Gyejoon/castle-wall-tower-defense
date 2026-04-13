import type { Grade } from '../types/grade';

export interface SummonPool {
	readonly towerIds: readonly string[];
}

export interface SummonResult {
	readonly towerId: string;
	readonly grade: Grade;
}

export function createSummonPool(towerIds: readonly string[]): SummonPool {
	return { towerIds: [...towerIds] };
}

export function drawRandomSummon(
	pool: SummonPool,
	rng: () => number = Math.random,
): SummonResult {
	if (pool.towerIds.length === 0) {
		throw new Error('drawRandomSummon: empty pool');
	}
	const idx = Math.floor(rng() * pool.towerIds.length);
	const towerId = pool.towerIds[Math.min(idx, pool.towerIds.length - 1)];
	return { towerId, grade: 'normal' };
}
