import type { StarRating } from '../constants/starDifficulty';

export const SAVE_VERSION = 4;
export const SAVE_STORAGE_KEY = 'gld-save-data';

export type TowerGrade = 'normal' | 'rare' | 'unique' | 'epic';
export const TOWER_GRADES: readonly TowerGrade[] = [
	'normal',
	'rare',
	'unique',
	'epic',
] as const;

export interface OwnedTower {
	defId: string;
	level: number; // 1~30
	grade: TowerGrade;
	acquiredAt: number;
	awakening: 0 | 1 | 2 | 3;
	duplicateCount: number;
}

export interface ProfileData {
	nickname: string;
	level: number; // 1~99
	xp: number;
	gold: number;
	diamond: number;
	totalGoldEarned: number;
	wins: number;
	losses: number;
	winStreak: number;
	bestWinStreak: number;
	combatPower: number;
}

export type MissionType =
	| 'reach_wave'
	| 'place_towers'
	| 'defeat_boss'
	| 'clear_stage'
	| 'use_element'
	| 'attendance';

export interface MissionProgress {
	id: string;
	type: MissionType;
	target: number;
	current: number;
	reward: { type: 'diamond' | 'gold'; amount: number };
	claimed: boolean;
}

export interface ProgressData {
	highestWave: Record<string, number>;
	stagesCleared: string[];
	totalBattles: number;
	tutorialCompleted: boolean;
	gachaPityCount: number;
	dailyFreeBoxClaimedAt: string | null;
	dailyAdBoxCount: number;
	dailyResetAt: string | null;
	dailyMissions: MissionProgress[];
	weeklyMissions: MissionProgress[];
	lastDailyMissionResetAt: string | null;
	lastWeeklyMissionResetAt: string | null;
	lastAttendanceDate: string | null;
	stageStars: Record<string, StarRating>;
	achievements: {
		claimed: string[];
		progress: Record<string, number>;
	};
	awakeningStones: number;
}

export interface SettingsData {
	bgmVolume: number; // 0~1, default 0.7
	sfxVolume: number; // 0~1, default 0.8
	screenShake: boolean;
	showDamageNumbers: boolean;
	colorblindMode: 'off' | 'protan' | 'deutan' | 'tritan';
}

export interface SaveData {
	version: number;
	profile: ProfileData;
	collection: OwnedTower[];
	progress: ProgressData;
	settings: SettingsData;
	selectedDeck: string[];
}
