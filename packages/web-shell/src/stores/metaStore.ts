import { createDefaultSave } from '@gld/shared';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { createCollectionSlice } from './meta/collectionSlice';
import { createGachaSlice } from './meta/gachaSlice';
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
			},

			...createProfileSlice(set, get),
			...createCollectionSlice(set, get),
			...createGachaSlice(set, get),
			...createSettingsSlice(set, get),
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
