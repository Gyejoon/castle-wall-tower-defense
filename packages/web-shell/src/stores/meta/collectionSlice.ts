import {
	ALL_TOWERS,
	calcCombatPower,
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
		const cp = calcCombatPower(get().collection);
		set((s) => ({ profile: { ...s.profile, combatPower: cp } }));
		// Tower level achievements
		const maxTowerLevel = Math.max(...get().collection.map((t) => t.level));
		get().updateAchievementProgress('tower_lv10', maxTowerLevel);
		get().updateAchievementProgress('tower_lv30', maxTowerLevel);
		get().updateAchievementProgress('tower_lv50', maxTowerLevel);
		// Combat power achievements
		get().updateAchievementProgress('cp_100', cp);
		get().updateAchievementProgress('cp_500', cp);
		get().updateAchievementProgress('cp_1000', cp);
		get().updateAchievementProgress('cp_5000', cp);
		get().updateAchievementProgress('cp_10000', cp);
		get().updateAchievementProgress('cp_50000', cp);
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
		if (tower.level < config.requiredLevel) return 'level_too_low';
		if (s.profile.gold < config.goldCost) return 'no_gold';

		const newGold = s.profile.gold - config.goldCost;
		const success = rng() < config.successRate;

		const newCollection = [...s.collection];
		if (success) {
			newCollection[idx] = {
				...tower,
				grade: config.nextGrade as TowerGrade,
				level: config.resetLevel ? 1 : tower.level,
			};
		}
		set({
			profile: { ...s.profile, gold: newGold },
			collection: newCollection,
		});
		const cp = calcCombatPower(get().collection);
		set((s) => ({ profile: { ...s.profile, combatPower: cp } }));
		// Grade achievements (only on success)
		if (success) {
			const newGrade = config.nextGrade as TowerGrade;
			if (newGrade === 'rare') get().updateAchievementProgress('tower_rare', 1);
			if (newGrade === 'unique') get().updateAchievementProgress('tower_unique', 1);
			if (newGrade === 'epic') get().updateAchievementProgress('tower_epic', 1);
		}
		// Combat power achievements
		get().updateAchievementProgress('cp_100', cp);
		get().updateAchievementProgress('cp_500', cp);
		get().updateAchievementProgress('cp_1000', cp);
		get().updateAchievementProgress('cp_5000', cp);
		get().updateAchievementProgress('cp_10000', cp);
		get().updateAchievementProgress('cp_50000', cp);
		debouncedSave(get());
		return success ? 'success' : 'fail';
	},
});
