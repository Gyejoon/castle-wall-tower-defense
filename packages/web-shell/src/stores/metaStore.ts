import { calcCombatPower, createDefaultSave } from '@gld/shared';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { createCollectionSlice } from './meta/collectionSlice';
import { createGachaSlice } from './meta/gachaSlice';
import { createMissionSlice } from './meta/missionSlice';
import {
	flushSaveWith,
	migrateLegacyDeck,
	parseSave,
	writeSave,
} from './meta/persistence';
import { createProfileSlice } from './meta/profileSlice';
import { createAchievementSlice } from './meta/achievementSlice';
import { createSettingsSlice } from './meta/settingsSlice';
import type { MetaState } from './meta/types';

export const useMetaStore = create<MetaState>()(
	subscribeWithSelector((set, get) => {
		const defaultSave = createDefaultSave();
		return {
			...defaultSave,

			loadSave: () => {
				// Read legacy tutorial_completed key before migration
				let legacyTutorialCompleted = false;
				try {
					legacyTutorialCompleted =
						localStorage.getItem('tutorial_completed') === 'true';
				} catch {}

				let save = parseSave({ tutorialCompleted: legacyTutorialCompleted });
				if (!save) {
					save = createDefaultSave();
					save = migrateLegacyDeck(save);
				}

				// Clean up legacy key
				try {
					localStorage.removeItem('tutorial_completed');
				} catch {}

				// Recalculate combatPower from collection (may be stale after migration)
				save.profile.combatPower = calcCombatPower(save.collection);

				set({
					version: save.version,
					profile: save.profile,
					collection: save.collection,
					progress: save.progress,
					settings: save.settings,
					selectedDeck: save.selectedDeck,
				});
				writeSave(save);

				// Sync achievement progress with current state
				const s = get();
				const cp = s.profile.combatPower;
				s.updateAchievementProgress('cp_100', cp);
				s.updateAchievementProgress('cp_500', cp);
				s.updateAchievementProgress('cp_1000', cp);
				s.updateAchievementProgress('cp_5000', cp);
				s.updateAchievementProgress('cp_10000', cp);
				s.updateAchievementProgress('cp_50000', cp);
				s.updateAchievementProgress('lv_5', s.profile.level);
				s.updateAchievementProgress('lv_10', s.profile.level);
				s.updateAchievementProgress('lv_20', s.profile.level);
				s.updateAchievementProgress('lv_50', s.profile.level);
				s.updateAchievementProgress('lv_99', s.profile.level);
				const clearCount = s.progress.stagesCleared.length;
				s.updateAchievementProgress('clear_1', clearCount);
				s.updateAchievementProgress('clear_10', clearCount);
				s.updateAchievementProgress('clear_50', clearCount);
				const maxLv = s.collection.length > 0 ? Math.max(...s.collection.map((t) => t.level)) : 0;
				s.updateAchievementProgress('tower_lv10', maxLv);
				s.updateAchievementProgress('tower_lv30', maxLv);
				s.updateAchievementProgress('tower_lv50', maxLv);
				if (s.collection.some((t) => t.grade === 'rare')) s.updateAchievementProgress('tower_rare', 1);
				if (s.collection.some((t) => t.grade === 'unique')) s.updateAchievementProgress('tower_unique', 1);
				if (s.collection.some((t) => t.grade === 'epic')) s.updateAchievementProgress('tower_epic', 1);
			},

			...createProfileSlice(set, get),
			...createCollectionSlice(set, get),
			...createGachaSlice(set, get),
			...createMissionSlice(set, get),
			...createSettingsSlice(set, get),
			...createAchievementSlice(set, get),
		};
	}),
);

// ── Persistence side effects (must be after store creation) ───

function flushSave() {
	const state = useMetaStore?.getState?.();
	if (state) flushSaveWith(state);
}

if (typeof window !== 'undefined') {
	const handleVisibilityForSave = () => {
		if (document.visibilityState === 'hidden') flushSave();
	};
	window.addEventListener('beforeunload', flushSave);
	document.addEventListener('visibilitychange', handleVisibilityForSave);
}
