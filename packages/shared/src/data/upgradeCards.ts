export interface UpgradeCardDef {
	readonly id: string;
	readonly name: string;
	readonly description: string;
	readonly icon: string;
	readonly stackType: 'multiply' | 'add';
	readonly baseValue: number;
}

export const UPGRADE_CARDS: readonly UpgradeCardDef[] = [
	{
		id: 'dmg_up',
		name: '공격력 강화',
		description: '타워 공격력 +15%',
		icon: '⚔️',
		stackType: 'multiply',
		baseValue: 0.15,
	},
	{
		id: 'spd_up',
		name: '공격속도 강화',
		description: '타워 공격속도 +20%',
		icon: '⏩',
		stackType: 'multiply',
		baseValue: 0.2,
	},
	{
		id: 'range_up',
		name: '사거리 확장',
		description: '타워 사거리 +0.5칸',
		icon: '🎯',
		stackType: 'add',
		baseValue: 0.5,
	},
	{
		id: 'kill_energy',
		name: '에너지 헌터',
		description: '킬 에너지 +1',
		icon: '💰',
		stackType: 'add',
		baseValue: 1,
	},
	{
		id: 'energy_regen',
		name: '에너지 재생',
		description: '초당 에너지 재생 +1',
		icon: '🔋',
		stackType: 'add',
		baseValue: 1,
	},
	{
		id: 'summon_discount',
		name: '소환 할인',
		description: '소환 비용 -3',
		icon: '🏷️',
		stackType: 'add',
		baseValue: 3,
	},
] as const;

/**
 * Pick `count` random upgrade cards from UPGRADE_CARDS with replacement
 * (same card can appear multiple times).
 */
export function pickRandomUpgrades(
	count: number,
	rng: () => number = Math.random,
): UpgradeCardDef[] {
	const result: UpgradeCardDef[] = [];
	for (let i = 0; i < count; i++) {
		const idx = Math.floor(rng() * UPGRADE_CARDS.length);
		result.push(UPGRADE_CARDS[Math.min(idx, UPGRADE_CARDS.length - 1)]);
	}
	return result;
}
