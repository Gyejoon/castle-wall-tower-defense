// packages/shared/src/constants/starDifficulty.ts

export const STAR_DIFFICULTY = {
	1: { hp: 1.0, armor: 1.0, speed: 1.0, ccResist: 0, label: '정복' },
	2: { hp: 2.5, armor: 1.5, speed: 1.2, ccResist: 0.2, label: '정예' },
	3: { hp: 5.0, armor: 2.5, speed: 1.4, ccResist: 0.4, label: '지옥' },
} as const;

export type StarRating = 1 | 2 | 3;

export const STAR_CLEAR_CONDITIONS = {
	1: { type: 'survival' as const, hpThreshold: 0 },
	2: { type: 'hp-threshold' as const, hpThreshold: 0.5 },
	3: { type: 'hp-threshold' as const, hpThreshold: 0.8 },
} as const;

export const STAR_REWARD_MULTIPLIERS = {
	1: { gold: 1, xp: 1, awakeningStone: 0 },
	2: { gold: 2.5, xp: 2, awakeningStone: 1 },
	3: { gold: 5, xp: 3, awakeningStone: 3 },
} as const;

/** ★3에서 HP 100% 유지 시 추가 보너스 */
export const PERFECT_CLEAR_BONUS = { awakeningStone: 2 } as const;

export function getStarDifficultyMult(star: StarRating) {
	return STAR_DIFFICULTY[star];
}

export function checkStarClear(
	star: StarRating,
	currentHp: number,
	maxHp: number,
): boolean {
	const condition = STAR_CLEAR_CONDITIONS[star];
	if (condition.type === 'survival') return true;
	return currentHp / maxHp >= condition.hpThreshold;
}
