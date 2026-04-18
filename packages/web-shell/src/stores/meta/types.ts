import type { GachaResult, SaveData } from '@gld/shared';

export interface MetaActions {
	loadSave: () => void;
	addGold: (amount: number) => void;
	addXp: (amount: number) => void;
	recordBattle: (result: 'victory' | 'defeat') => void;
	updateHighestWave: (wave: number) => void;
	enhanceTower: (
		defId: string,
	) => 'success' | 'max_level' | 'no_gold' | 'not_found';
	setSelectedDeck: (deck: string[]) => void;
	updateSettings: (patch: Partial<SaveData['settings']>) => void;
	addDiamond: (amount: number) => void;
	updateProgress: (patch: Partial<SaveData['progress']>) => void;
	openGacha: (
		boxType: 'free' | 'ad' | 'diamond_single' | 'diamond_ten',
		rng?: () => number,
	) => GachaResult[] | 'no_diamond' | 'cooldown' | 'daily_limit';
}

export type MetaState = SaveData & MetaActions;

/** Zustand slice creator type */
export type SliceCreator<T> = (
	set: (
		partial: Partial<MetaState> | ((state: MetaState) => Partial<MetaState>),
	) => void,
	get: () => MetaState,
) => T;
