/**
 * In-battle gold-spend tower enhance — separate from the meta-level
 * (collection) enhance in `meta.ts`. The player taps a placed tower → spends
 * gold accumulated from kills during the current run → tower's level
 * increments by 1 and effective damage scales by `enhanceDamageMultiplier`.
 *
 * Cost grows geometrically with level so each upgrade feels increasingly
 * expensive without becoming flat-impossible. The 5-rounding keeps the cost
 * badge readable.
 */

/** Base cost for the first in-battle enhance (level 1 → 2). */
export const BASE_ENHANCE_COST = 50;

/** Hard ceiling per tower. Button disables once a tower hits this level. */
export const MAX_IN_BATTLE_LEVEL = 10;

/** Geometric growth ratio applied per existing level. */
const ENHANCE_COST_GROWTH = 1.5;

/**
 * Cost (in gold) to enhance a tower from `level` → `level + 1`.
 * Result is rounded to the nearest multiple of 5 so the HUD badge is tidy.
 *
 * @param level Current tower level (1-based).
 * @returns Gold cost for the next enhance, or `Infinity` once the level is at
 *          or above the cap so callers can short-circuit on `>= MAX`.
 */
export function inBattleEnhanceCost(level: number): number {
	if (level >= MAX_IN_BATTLE_LEVEL) return Number.POSITIVE_INFINITY;
	const raw = BASE_ENHANCE_COST * ENHANCE_COST_GROWTH ** (level - 1);
	return Math.round(raw / 5) * 5;
}

/**
 * Damage multiplier for a tower at `level` (1-based) under the in-battle
 * enhance. +15% per level above 1 — flat additive scaling so the math stays
 * predictable in the HUD and tests.
 */
export function inBattleDamageMultiplier(level: number): number {
	return 1 + 0.15 * (Math.max(level, 1) - 1);
}
