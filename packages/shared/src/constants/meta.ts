import type { OwnedTower, SaveData, TowerGrade } from '../types/save';
import { SAVE_VERSION } from '../types/save';

export function xpToNextLevel(level: number): number {
	return Math.floor(100 + (level - 1) * 50 + (level - 1) ** 2 * 5);
}

export function battleXp(wavesCleared: number, victory: boolean): number {
	return wavesCleared * 10 + (victory ? 50 : 0);
}

const TIER_COST_MULT = [0, 1, 1.5, 2, 3, 5];

const GRADE_COST_MULT: Record<TowerGrade, number> = {
	normal: 1.0,
	rare: 2.0,
	unique: 4.0,
	epic: 8.0,
};

export function enhancementCost(
	level: number,
	tier: number,
	grade: TowerGrade = 'normal',
): number {
	return Math.floor(
		(50 + level * 20) * TIER_COST_MULT[tier] * GRADE_COST_MULT[grade],
	);
}

export function enhancementStatMultiplier(level: number): number {
	return 1 + (level - 1) * 0.04;
}

export function stunCooldownMultiplier(level: number): number {
	// LV.1~10: -1%/lv (누적 -9%), LV.11~30: -1%/lv 추가 (누적 -29%), LV.31~50: 플래토
	if (level <= 10) return 1 - (level - 1) * 0.01;
	if (level <= 30) return 0.91 - (level - 10) * 0.01;
	return 0.71;
}

export function stunDurationMultiplier(level: number): number {
	// LV.1~10: 1.0, LV.11~20: +2%/lv (1.0→1.2), LV.21~30: 플래토, LV.31~50: +1%/lv (1.2→1.4)
	if (level <= 10) return 1.0;
	if (level <= 20) return 1.0 + (level - 10) * 0.02;
	if (level <= 30) return 1.2;
	return 1.2 + (level - 30) * 0.01;
}

export const MAX_TOWER_LEVEL = 50;

export const GRADE_MAX_LEVEL: Record<TowerGrade, number> = {
	normal: 20,
	rare: 30,
	unique: 50,
	epic: 50,
};

export function maxLevelForGrade(grade: TowerGrade): number {
	return GRADE_MAX_LEVEL[grade];
}

export const PROMOTION_CONFIG = {
	normal: {
		nextGrade: 'rare' as TowerGrade,
		goldCost: 500,
		successRate: 0.8,
		statBonus: 0.1,
		requiredLevel: 20,
		resetLevel: true,
	},
	rare: {
		nextGrade: 'unique' as TowerGrade,
		goldCost: 2000,
		successRate: 0.5,
		statBonus: 0.15,
		requiredLevel: 30,
		resetLevel: true,
	},
	unique: {
		nextGrade: 'epic' as TowerGrade,
		goldCost: 8000,
		successRate: 0.25,
		statBonus: 0.2,
		requiredLevel: 50,
		resetLevel: true,
	},
	epic: {
		nextGrade: null,
		goldCost: 0,
		successRate: 0,
		statBonus: 0,
		requiredLevel: 0,
		resetLevel: false,
	},
} as const;

export const GRADE_BONUS: Record<TowerGrade, number> = {
	normal: 0,
	rare: 0.8,
	unique: 3.5,
	epic: 13.0,
};

export function getEffectiveStats(
	baseDamage: number,
	level: number,
	grade: TowerGrade,
): number {
	return (
		baseDamage * enhancementStatMultiplier(level) * (1 + GRADE_BONUS[grade])
	);
}

/** Wave 1 시작 전 플레이어 준비 시간(ms) — 튜토리얼 1회차 한정 */
export const INITIAL_PREP_MS = 5000;

const DEFAULT_STARTER_IDS = ['archer', 'plasma', 'emp', 'shield'];

export function createDefaultSave(): SaveData {
	const now = Date.now();
	return {
		version: SAVE_VERSION,
		profile: {
			nickname: 'Commander',
			level: 1,
			xp: 0,
			gold: 500,
			diamond: 0,
			totalGoldEarned: 0,
			wins: 0,
			losses: 0,
			winStreak: 0,
			bestWinStreak: 0,
			combatPower: 0,
		},
		collection: DEFAULT_STARTER_IDS.map<OwnedTower>((defId) => ({
			defId,
			level: 1,
			grade: 'normal',
			acquiredAt: now,
			awakening: 0,
			duplicateCount: 0,
		})),
		progress: {
			highestWave: {},
			stagesCleared: [],
			totalBattles: 0,
			tutorialCompleted: false,
			gachaPityCount: 0,
			dailyFreeBoxClaimedAt: null,
			dailyAdBoxCount: 0,
			dailyResetAt: null,
			dailyMissions: [],
			weeklyMissions: [],
			lastDailyMissionResetAt: null,
			lastWeeklyMissionResetAt: null,
			lastAttendanceDate: null,
			stageStars: {},
			achievements: { claimed: [], progress: {} },
			awakeningStones: 0,
		},
		settings: {
			bgmVolume: 0.7,
			sfxVolume: 0.8,
			screenShake: true,
			colorblindMode: 'off',
		},
		selectedDeck: [...DEFAULT_STARTER_IDS],
	};
}
