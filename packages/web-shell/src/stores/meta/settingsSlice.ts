import { debouncedSave } from './persistence';
import type { MetaActions, SliceCreator } from './types';

export const createSettingsSlice: SliceCreator<
	Pick<
		MetaActions,
		'setSelectedDeck' | 'updateSettings' | 'addDiamond' | 'updateProgress'
	>
> = (set, get) => ({
	setSelectedDeck: (deck) => {
		set({ selectedDeck: deck });
		debouncedSave(get());
	},

	updateSettings: (patch) => {
		set((s) => ({
			settings: { ...s.settings, ...patch },
		}));
		debouncedSave(get());
	},

	addDiamond: (amount) => {
		set((s) => ({
			profile: { ...s.profile, diamond: s.profile.diamond + amount },
		}));
		debouncedSave(get());
	},

	updateProgress: (patch) => {
		set((s) => ({ progress: { ...s.progress, ...patch } }));
		debouncedSave(get());
	},
});
