import { createDefaultSave } from '@gld/shared';
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

				set({
					version: save.version,
					profile: save.profile,
					collection: save.collection,
					progress: save.progress,
					settings: save.settings,
					selectedDeck: save.selectedDeck,
				});
				writeSave(save);
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
