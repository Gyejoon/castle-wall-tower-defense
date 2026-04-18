import { calcCombatPower, createDefaultSave } from '@gld/shared';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { createAchievementSlice } from './meta/achievementSlice';
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
import { createSettingsSlice } from './meta/settingsSlice';
import type { MetaState } from './meta/types';

export const useMetaStore = create<MetaState>()(
	subscribeWithSelector((set, get) => {
		const defaultSave = createDefaultSave();
		return {
			...defaultSave,

			loadSave: () => {
				// Phase 1: Load & persist save data
				try {
					let legacyTutorialCompleted = false;
					try {
						legacyTutorialCompleted =
							localStorage.getItem('tutorial_completed') === 'true';
					} catch {}

					let save = parseSave({
						tutorialCompleted: legacyTutorialCompleted,
					});
					if (!save) {
						save = createDefaultSave();
						save = migrateLegacyDeck(save);
					}

					try {
						localStorage.removeItem('tutorial_completed');
					} catch {}

					save.profile.combatPower = calcCombatPower(
						save.collection,
						save.selectedDeck,
					);

					set({
						version: save.version,
						profile: save.profile,
						collection: save.collection,
						progress: save.progress,
						settings: save.settings,
						selectedDeck: save.selectedDeck,
					});
					writeSave(save);
				} catch (err) {
					console.error('[GLD] loadSave failed, resetting to default:', err);
					const fallback = createDefaultSave();
					set({
						version: fallback.version,
						profile: fallback.profile,
						collection: fallback.collection,
						progress: fallback.progress,
						settings: fallback.settings,
						selectedDeck: fallback.selectedDeck,
					});
					writeSave(fallback);
				}

				// Phase 2: Sync achievements (non-fatal — save is already persisted)
				try {
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
					const maxLv =
						s.collection.length > 0
							? Math.max(...s.collection.map((t) => t.level))
							: 0;
					s.updateAchievementProgress('tower_lv10', maxLv);
					s.updateAchievementProgress('tower_lv30', maxLv);
					s.updateAchievementProgress('tower_lv50', maxLv);
					// Phase 1: grade-based achievements (tower_rare / _unique / _epic)
					// were dropped alongside the grade system. Tier-based replacements
					// land with Phase 9's meta-loop rebuild.

					const stageStars = s.progress.stageStars;
					const star2Count = Object.values(stageStars).filter(
						(r) => r >= 2,
					).length;
					const star3Count = Object.values(stageStars).filter(
						(r) => r >= 3,
					).length;
					s.updateAchievementProgress('star2_all', star2Count);
					s.updateAchievementProgress('star3_all', star3Count);
				} catch (err) {
					console.error('[GLD] Achievement sync failed (non-fatal):', err);
				}
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
