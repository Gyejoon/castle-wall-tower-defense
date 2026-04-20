import type { TowerFamily } from '../types/tower';

/**
 * Run-scoped family upgrade — spends energy to stack a flat damage buff on
 * every placed tower of the target family (archer / siege / frost / stun).
 *
 * Kept separate from the roguelike card stack (which applies to every tower
 * regardless of family) so players can invest into the side that suits their
 * current board.
 */

/** Four base families the upgrade UI exposes. Hybrid / ultimate inherit from
 *  whichever base family pair fed them (hybrid → archer+siege: both buffs
 *  apply multiplicatively; see `getFamilyDamageMultiplier`). */
export const UPGRADEABLE_FAMILIES = [
	'archer',
	'siege',
	'frost',
	'stun',
] as const satisfies readonly TowerFamily[];

export type UpgradeableFamily = (typeof UPGRADEABLE_FAMILIES)[number];

/** Per-level flat damage bonus. +75% / level, stacks additively. Aggressive
 *  curve so each tap feels impactful:
 *    Lv.1  ×1.75   Lv.3  ×3.25   Lv.5  ×4.75
 *    Lv.7  ×6.25   Lv.10 ×8.5
 *  Trades granularity for punchiness — early upgrades now carry mid-wave
 *  bosses on their own, which matches the "쎄게 올려라" tuning goal. */
export const FAMILY_UPGRADE_DAMAGE_PER_LEVEL = 0.75;

/** Base energy cost for the first family upgrade (level 0 → 1). */
export const BASE_FAMILY_UPGRADE_COST = 30;

/** Geometric growth ratio applied per existing level. */
const FAMILY_UPGRADE_COST_GROWTH = 1.25;

/** Hard ceiling per family. Lv.20 is practically unreachable in a single
 *  run (cost 30 × 1.25^19 ≈ 2080 energy for the last step) but leaves
 *  headroom for deep-into-endless plays where energy compounds. */
export const MAX_FAMILY_UPGRADE_LEVEL = 20;

/**
 * Energy cost to take a family from `level → level + 1`. Rounded to the
 * nearest multiple of 5 so the HUD badge is tidy. Returns `Infinity` once
 * the level is at the cap.
 *
 * Schedule (level → cost):
 *   0→1  30     10→11 350
 *   1→2  40     11→12 435
 *   2→3  45     12→13 545
 *   3→4  60     13→14 680
 *   4→5  75     14→15 850
 *   5→6  90     15→16 1065
 *   6→7  115    16→17 1330
 *   7→8  145    17→18 1665
 *   8→9  180    18→19 2080
 *   9→10 225    19→20 2600
 */
export function familyUpgradeCost(level: number): number {
	if (level >= MAX_FAMILY_UPGRADE_LEVEL) return Number.POSITIVE_INFINITY;
	const raw = BASE_FAMILY_UPGRADE_COST * FAMILY_UPGRADE_COST_GROWTH ** level;
	return Math.round(raw / 5) * 5;
}

/** Damage multiplier applied to every attack from a tower whose family is
 *  upgraded to `level`. `1 + 0.75 × level` — Lv.10 → ×8.5, Lv.20 → ×16. */
export function familyDamageMultiplier(level: number): number {
	return 1 + FAMILY_UPGRADE_DAMAGE_PER_LEVEL * Math.max(level, 0);
}
