export const SAVE_VERSION = 1;
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
}

export interface ProfileData {
	nickname: string;
	level: number; // 1~99
	xp: number;
	gold: number;
	totalGoldEarned: number;
	wins: number;
	losses: number;
	winStreak: number;
	bestWinStreak: number;
}

export interface ProgressData {
	highestWave: Record<string, number>;
	stagesCleared: string[];
	totalBattles: number;
}

export interface SettingsData {
	soundEnabled: boolean;
	screenShake: boolean;
	showDamageNumbers: boolean;
}

export interface SaveData {
	version: number;
	profile: ProfileData;
	collection: OwnedTower[];
	progress: ProgressData;
	settings: SettingsData;
	selectedDeck: string[];
}
