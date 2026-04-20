import {
	dupesRequiredForLevel,
	enhancementCost,
	getTowerById,
	MAX_TOWER_LEVEL,
} from '@gld/shared';
import { debouncedSave } from './persistence';
import type { MetaActions, SliceCreator } from './types';

/**
 * Meta tower level-up. Costs gold + duplicate towers (from 소환의 제단)
 * stacked via `duplicateCount`. Dupes required doubles per level
 * (1→2=1, 2→3=2, 3→4=4, …, 49→50=2^48) and caps at MAX_TOWER_LEVEL.
 */
export const createCollectionSlice: SliceCreator<
	Pick<MetaActions, 'enhanceTower'>
> = (set, get) => ({
	enhanceTower: (defId) => {
		const s = get();
		const idx = s.collection.findIndex((t) => t.defId === defId);
		if (idx === -1) return 'not_found';
		const tower = s.collection[idx];
		if (tower.level >= MAX_TOWER_LEVEL) return 'max_level';
		const towerDef = getTowerById(defId);
		if (!towerDef) return 'not_found';
		const cost = enhancementCost(tower.level, towerDef.tier);
		const dupesNeeded = dupesRequiredForLevel(tower.level);
		if (tower.duplicateCount < dupesNeeded) return 'no_dupes';
		if (s.profile.gold < cost) return 'no_gold';

		const newCollection = [...s.collection];
		newCollection[idx] = {
			...tower,
			level: tower.level + 1,
			duplicateCount: tower.duplicateCount - dupesNeeded,
		};
		set({
			profile: { ...s.profile, gold: s.profile.gold - cost },
			collection: newCollection,
		});
		debouncedSave(get());
		return 'success';
	},
});
