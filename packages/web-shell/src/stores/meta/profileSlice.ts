import { type SaveData, xpToNextLevel } from '@gld/shared';
import { debouncedSave } from './persistence';
import type { MetaActions, SliceCreator } from './types';

function applyLevelUps(profile: SaveData['profile']): SaveData['profile'] {
	let { level, xp } = profile;
	let needed = xpToNextLevel(level);
	while (xp >= needed && level < 99) {
		xp -= needed;
		level += 1;
		needed = xpToNextLevel(level);
	}
	return { ...profile, level, xp };
}

export const createProfileSlice: SliceCreator<
	Pick<MetaActions, 'addGold' | 'addXp' | 'recordBattle' | 'updateHighestWave'>
> = (set, get) => ({
	addGold: (amount) => {
		set((s) => ({
			profile: {
				...s.profile,
				gold: s.profile.gold + amount,
				totalGoldEarned: s.profile.totalGoldEarned + Math.max(0, amount),
			},
		}));
		debouncedSave(get());
	},

	addXp: (amount) => {
		set((s) => ({
			profile: applyLevelUps({ ...s.profile, xp: s.profile.xp + amount }),
		}));
		debouncedSave(get());
	},

	recordBattle: (result) => {
		set((s) => {
			const isWin = result === 'victory';
			const newStreak = isWin ? s.profile.winStreak + 1 : 0;
			return {
				profile: {
					...s.profile,
					wins: s.profile.wins + (isWin ? 1 : 0),
					losses: s.profile.losses + (isWin ? 0 : 1),
					winStreak: newStreak,
					bestWinStreak: Math.max(s.profile.bestWinStreak, newStreak),
				},
				progress: {
					...s.progress,
					totalBattles: s.progress.totalBattles + 1,
				},
			};
		});
		debouncedSave(get());
	},

	updateHighestWave: (wave) => {
		set((s) => ({
			progress: {
				...s.progress,
				highestWave: Math.max(s.progress.highestWave ?? 0, wave),
			},
		}));
		debouncedSave(get());
	},
});
