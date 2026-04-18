import { calcCombatPower } from '@gld/shared';
import { debouncedSave } from './persistence';
import type { MetaActions, SliceCreator } from './types';

export const createSettingsSlice: SliceCreator<
	Pick<
		MetaActions,
		'setSelectedDeck' | 'updateSettings' | 'addDiamond' | 'updateProgress'
	>
> = (set, get) => ({
	setSelectedDeck: (deck) => {
		const s = get();
		const cp = calcCombatPower(s.collection, deck);
		set({
			selectedDeck: deck,
			profile: { ...s.profile, combatPower: cp },
		});
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
