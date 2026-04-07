import type { OwnedTower, SaveData, TowerGrade } from '../types/save';
import { SAVE_VERSION } from '../types/save';

export function xpToNextLevel(level: number): number {
	return Math.floor(100 + (level - 1) * 50 + (level - 1) ** 2 * 5);
}

export function battleXp(wavesCleared: number, victory: boolean): number {
	return wavesCleared * 10 + (victory ? 50 : 0);
}

const TIER_COST_MULT = [0, 1, 1.5, 2, 3, 5];

export function enhancementCost(level: number, tier: number): number {
	return Math.floor((50 + level * 20) * TIER_COST_MULT[tier]);
}

export function enhancementStatMultiplier(level: number): number {
	return 1 + (level - 1) * 0.03;
}

export const MAX_TOWER_LEVEL = 30;

export const PROMOTION_CONFIG = {
	normal: {
		nextGrade: 'rare' as TowerGrade,
		goldCost: 500,
		successRate: 0.8,
		statBonus: 0.1,
	},
	rare: {
		nextGrade: 'unique' as TowerGrade,
		goldCost: 2000,
		successRate: 0.5,
		statBonus: 0.15,
	},
	unique: {
		nextGrade: 'epic' as TowerGrade,
		goldCost: 8000,
		successRate: 0.25,
		statBonus: 0.2,
	},
	epic: { nextGrade: null, goldCost: 0, successRate: 0, statBonus: 0 },
} as const;

const GRADE_BONUS: Record<TowerGrade, number> = {
	normal: 0,
	rare: 0.1,
	unique: 0.25,
	epic: 0.45,
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

const DEFAULT_STARTER_IDS = ['laser', 'plasma', 'emp', 'shield'];

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
		},
		collection: DEFAULT_STARTER_IDS.map<OwnedTower>((defId) => ({
			defId,
			level: 1,
			grade: 'normal',
			acquiredAt: now,
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
		},
		settings: {
			bgmVolume: 0.7,
			sfxVolume: 0.8,
			screenShake: true,
			showDamageNumbers: true,
			colorblindMode: 'off',
		},
		selectedDeck: [...DEFAULT_STARTER_IDS],
	};
}
