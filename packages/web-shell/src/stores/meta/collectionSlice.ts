import {
	ALL_TOWERS,
	enhancementCost,
	MAX_TOWER_LEVEL,
	PROMOTION_CONFIG,
	type TowerGrade,
} from '@gld/shared';
import { debouncedSave } from './persistence';
import type { MetaActions, SliceCreator } from './types';

export const createCollectionSlice: SliceCreator<
	Pick<MetaActions, 'enhanceTower' | 'promoteTower'>
> = (set, get) => ({
	enhanceTower: (defId) => {
		const s = get();
		const idx = s.collection.findIndex((t) => t.defId === defId);
		if (idx === -1) return 'not_found';
		const tower = s.collection[idx];
		if (tower.level >= MAX_TOWER_LEVEL) return 'max_level';
		const towerDef = ALL_TOWERS.find((t) => t.id === defId);
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

	promoteTower: (defId, rng = Math.random) => {
		const s = get();
		const idx = s.collection.findIndex((t) => t.defId === defId);
		if (idx === -1) return 'not_found';
		const tower = s.collection[idx];
		const config = PROMOTION_CONFIG[tower.grade];
		if (!config.nextGrade) return 'max_grade';
		if (s.profile.gold < config.goldCost) return 'no_gold';

		const newGold = s.profile.gold - config.goldCost;
		const success = rng() < config.successRate;

		const newCollection = [...s.collection];
		if (success) {
			newCollection[idx] = {
				...tower,
				grade: config.nextGrade as TowerGrade,
			};
		}
		set({
			profile: { ...s.profile, gold: newGold },
			collection: newCollection,
		});
		debouncedSave(get());
		return success ? 'success' : 'fail';
	},
});
