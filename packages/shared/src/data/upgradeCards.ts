/**
 * Phase A roguelike upgrade cards (Phase 4 redesign).
 *
 * The previous six cards (spd_up/range_up/summon_discount/kill_energy) were
 * rebuilt around the merge+gacha loop: damage, crit, energy-per-kill,
 * energy regen, status-effect amplification, and gacha tier odds.
 *
 * Stacking model:
 * - `stackType: 'multiply'` → final multiplier = `value^stackCount`
 * - `stackType: 'add'`      → final value     = `value * stackCount`
 *
 * `interval` / `amount` metadata is optional and only meaningful for cards
 * with periodic effects (currently just `energy_regen`).
 */
export type UpgradeId =
	| 'dmg_up'
	| 'crit_dmg'
	| 'energy_harvest'
	| 'energy_regen'
	| 'effect_amp'
	| 'tier_odds_up';

export interface UpgradeCard {
	readonly id: UpgradeId;
	readonly name: string;
	readonly description: string;
	readonly icon: string;
	readonly stackType: 'multiply' | 'add';
	readonly value: number;
	/** Milliseconds between ticks for periodic effects. */
	readonly interval?: number;
	/** Amount granted per tick for periodic effects. */
	readonly amount?: number;
}

/**
 * Backwards-compatible alias. Older call-sites imported `UpgradeCardDef`; the
 * Phase 4 redesign renames the type but keeps the alias so we don't churn
 * consumers that only need the shape.
 */
export type UpgradeCardDef = UpgradeCard;

export const UPGRADE_CARDS: readonly UpgradeCard[] = [
	{
		id: 'dmg_up',
		name: '공격력 증폭',
		description: '모든 타워 공격력 +20%',
		icon: '⚔️',
		stackType: 'multiply',
		value: 1.2,
	},
	{
		id: 'crit_dmg',
		name: '치명의 일격',
		description: '치명타 데미지 +25%',
		icon: '💥',
		stackType: 'add',
		value: 0.25,
	},
	{
		id: 'energy_harvest',
		name: '에너지 수확',
		description: '유닛 킬당 에너지 +1',
		icon: '🌾',
		stackType: 'add',
		value: 1,
	},
	{
		id: 'energy_regen',
		name: '에너지 재생',
		description: '5초마다 에너지 +2',
		icon: '🔋',
		stackType: 'add',
		value: 2,
		interval: 5000,
		amount: 2,
	},
	{
		id: 'effect_amp',
		name: '상태효과 증폭',
		description: '빙결/스턴 지속 +25%',
		icon: '❄️',
		stackType: 'multiply',
		value: 1.25,
	},
	{
		id: 'tier_odds_up',
		name: '운의 가호',
		description: '가챠 성공률 +5%p',
		icon: '🍀',
		stackType: 'add',
		value: 0.05,
	},
] as const;

/**
 * Pick `count` DISTINCT random upgrade cards from `UPGRADE_CARDS`. The
 * roguelike pick overlay never shows duplicates in a single offering — the
 * old "with replacement" behavior belonged to the pre-redesign deck.
 *
 * `count` is clamped to the card pool size.
 */
export function pickRandomUpgrades(
	count: number,
	rng: () => number = Math.random,
): UpgradeCard[] {
	const pool = [...UPGRADE_CARDS];
	const n = Math.max(0, Math.min(count, pool.length));
	const picks: UpgradeCard[] = [];
	for (let i = 0; i < n; i++) {
		const idx = Math.min(Math.floor(rng() * pool.length), pool.length - 1);
		picks.push(pool[idx]);
		pool.splice(idx, 1);
	}
	return picks;
}
