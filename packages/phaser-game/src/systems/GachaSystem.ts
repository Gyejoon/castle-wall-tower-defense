import {
	getTowersByFamily,
	INGAME_GACHA,
	type TowerFamily,
	type TowerId,
} from '@gld/shared';

/**
 * Base families used by the ingame gacha roll. Hybrid/ultimate families are
 * reached only via merging and are excluded from the gacha table.
 */
const FAMILIES: readonly TowerFamily[] = ['archer', 'siege', 'frost', 'stun'];

/**
 * Hard ceiling on the effective success rate after applying the
 * `tier_odds_up` bonus. Mirrors the plan §Phase 5 clamp — never allow the
 * gacha to become a deterministic roll, even if the stack maxes out.
 */
export const GACHA_SUCCESS_RATE_CAP = 0.95;

/**
 * Phase 5 ingame gacha. Stateless helper — consumers pass in both the target
 * tier and a (optional) deterministic RNG so tests can replay sequences.
 *
 *   1. Roll success/fail against `INGAME_GACHA[tierN].successRate + oddsBonus`
 *      (clamped at {@link GACHA_SUCCESS_RATE_CAP}).
 *   2. Roll a family uniformly from the four base families.
 *   3. Return the base tower id for that (family, tier) pair; on failure the
 *      tier collapses to 1 (consolation tower from the same family).
 */
export class GachaSystem {
	static rollTier(
		targetTier: 2 | 3 | 4,
		rng: () => number = Math.random,
		oddsBonus = 0,
	): TowerId {
		const key = `tier${targetTier}` as keyof typeof INGAME_GACHA;
		const baseRate = INGAME_GACHA[key].successRate;
		const rate = Math.min(GACHA_SUCCESS_RATE_CAP, baseRate + oddsBonus);
		const success = rng() < rate;
		const family = FAMILIES[Math.floor(rng() * FAMILIES.length)] as TowerFamily;
		const tier = success ? targetTier : 1;
		const candidates = getTowersByFamily(family).filter((t) => t.tier === tier);
		// Each (family, tier) pair resolves to exactly one base tower in the
		// Phase 1 catalog of 16 towers. `candidates[0]` is always defined for
		// the tiers this system supports. `TowerDef.id` is declared as string
		// for ergonomic call-sites, but the catalog only contains valid
		// TowerId values — cast through.
		return candidates[0].id as TowerId;
	}

	static getCost(targetTier: 2 | 3 | 4): number {
		const key = `tier${targetTier}` as keyof typeof INGAME_GACHA;
		return INGAME_GACHA[key].cost;
	}
}
