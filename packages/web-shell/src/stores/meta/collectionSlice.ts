import { enhancementCost, getTowerById, MAX_TOWER_LEVEL } from '@gld/shared';
import { debouncedSave } from './persistence';
import type { MetaActions, SliceCreator } from './types';

/**
 * Phase 1 shim: grade-based enhance/promote were removed alongside the
 * grade system. `enhanceTower` still does a flat Lv+1 against a single
 * MAX_TOWER_LEVEL ceiling; Phase 9 rebuilds the real meta loop
 * (Prestige / awakening / etc.).
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
		if (s.profile.gold < cost) return 'no_gold';

		const newCollection = [...s.collection];
		newCollection[idx] = { ...tower, level: tower.level + 1 };
		set({
			profile: { ...s.profile, gold: s.profile.gold - cost },
			collection: newCollection,
		});
		debouncedSave(get());
		return 'success';
	},
});
