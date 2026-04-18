/**
 * Energy cost to fire one summon in Phase A. Matches T1 tower cost
 * in the new family/tier model so draw→place is a 1-to-1 swap.
 */
export const PHASE_A_SUMMON_COST = 20;

/**
 * Phase A summon pool. Tier-1 towers only, one per base family (archer,
 * siege, frost, stun). Uniform draw — replacement is the merge system.
 */
export interface SummonPoolEntry {
	readonly towerId: string;
	readonly weight: number;
}

export interface SummonPool {
	readonly entries: readonly SummonPoolEntry[];
	/** Convenience view for legacy consumers that only want the ids. */
	readonly towerIds: readonly string[];
}

export interface SummonResult {
	readonly towerId: string;
}

const DEFAULT_POOL: readonly SummonPoolEntry[] = [
	{ towerId: 'archer', weight: 1 },
	{ towerId: 'nova_cannon', weight: 1 },
	{ towerId: 'emp', weight: 1 },
	{ towerId: 'shield', weight: 1 },
];

/**
 * Build a summon pool. Accepts either a plain list of tower IDs (uniform
 * weight 1) or a list of {towerId, weight} entries so callers can
 * rebalance later without changing the shape.
 */
export function createSummonPool(
	entries: readonly (string | SummonPoolEntry)[] = DEFAULT_POOL,
): SummonPool {
	const normalized: SummonPoolEntry[] = entries.map((e) =>
		typeof e === 'string' ? { towerId: e, weight: 1 } : { ...e },
	);
	return {
		entries: normalized,
		towerIds: normalized.map((e) => e.towerId),
	};
}

/** Refund when selling a freshly-summoned tower. Tier-based — Phase A pays
 *  back half of whatever the caller wants to denote as base cost. */
export function getPhaseARefund(): number {
	return PHASE_A_SUMMON_COST / 2;
}

export function drawRandomSummon(
	pool: SummonPool,
	rng: () => number = Math.random,
): SummonResult {
	if (pool.entries.length === 0) {
		throw new Error('drawRandomSummon: empty pool');
	}
	const totalWeight = pool.entries.reduce((s, e) => s + e.weight, 0);
	let roll = rng() * totalWeight;
	for (const entry of pool.entries) {
		roll -= entry.weight;
		if (roll <= 0) return { towerId: entry.towerId };
	}
	// Fallback (rng returned exactly 1.0 or FP slop)
	return { towerId: pool.entries[pool.entries.length - 1].towerId };
}
