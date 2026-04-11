import type {
	GachaResult,
	MissionType,
	SaveData,
	StarRating,
} from '@gld/shared';

export interface MetaActions {
	loadSave: () => void;
	addGold: (amount: number) => void;
	addXp: (amount: number) => void;
	recordBattle: (result: 'victory' | 'defeat') => void;
	updateHighestWave: (mapId: string, wave: number) => void;
	enhanceTower: (
		defId: string,
	) => 'success' | 'max_level' | 'no_gold' | 'not_found';
	promoteTower: (
		defId: string,
		rng?: () => number,
	) =>
		| 'success'
		| 'fail'
		| 'max_grade'
		| 'no_gold'
		| 'not_found'
		| 'level_too_low';
	setSelectedDeck: (deck: string[]) => void;
	updateSettings: (patch: Partial<SaveData['settings']>) => void;
	addDiamond: (amount: number) => void;
	refreshMissions: () => void;
	progressMission: (type: MissionType, amount: number, mapId?: string) => void;
	claimMission: (
		missionId: string,
		period: 'daily' | 'weekly',
	) => 'success' | 'not_ready' | 'not_found';
	updateProgress: (patch: Partial<SaveData['progress']>) => void;
	openGacha: (
		boxType: 'free' | 'ad' | 'diamond_single' | 'diamond_ten',
		rng?: () => number,
	) => GachaResult[] | 'no_diamond' | 'cooldown' | 'daily_limit';
	recordStageClear: (mapId: string) => void;
	recordStarClear: (mapId: string, star: StarRating) => void;
	addAwakeningStones: (amount: number) => void;
	recordAttendance: () => void;
	updateAchievementProgress: (id: string, value: number) => void;
	claimAchievement: (id: string) => 'success' | 'not_ready' | 'already_claimed';
	checkAchievements: () => string[];
}

export type MetaState = SaveData & MetaActions;

/** Zustand slice creator type */
export type SliceCreator<T> = (
	set: (
		partial: Partial<MetaState> | ((state: MetaState) => Partial<MetaState>),
	) => void,
	get: () => MetaState,
) => T;
