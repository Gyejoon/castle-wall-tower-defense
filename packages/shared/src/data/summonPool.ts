import type { Grade } from '../types/grade';

/**
 * Energy cost to fire one summon in Phase A. Tuned for INITIAL_ENERGY=40 +
 * 1 energy/sec regen + ENERGY_PER_WAVE_CLEAR=5 across the 7-wave phase_a_s1
 * stage — gives ~5 free summons at start, plus enough budget for ongoing
 * builds and merges through the run.
 */
export const PHASE_A_SUMMON_COST = 8;

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
