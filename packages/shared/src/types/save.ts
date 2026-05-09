export const SAVE_VERSION = 8;
export const SAVE_STORAGE_KEY = 'gld-save-data';

export interface OwnedTower {
	defId: string;
	level: number; // 1~MAX_TOWER_LEVEL
	tier: number; // 1-6; family/tier model (replaces legacy grade)
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
}

export interface ProgressData {
	/** Highest wave reached in any 정식 모드 run. Scalar since Phase 7 (v8). */
	highestWave: number;
	highestActReached: number;
	highestCheckpointWave: number;
	bestWallHpRemaining: number;
	bestTowerFamiliesBuilt: string[];
	totalBattles: number;
	tutorialCompleted: boolean;
	gachaPityCount: number;
	dailyFreeBoxClaimedAt: string | null;
	dailyAdBoxCount: number;
	dailyResetAt: string | null;
}

export interface SettingsData {
	bgmVolume: number; // 0~1, default 0.7
	sfxVolume: number; // 0~1, default 0.8
	screenShake: boolean;
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
