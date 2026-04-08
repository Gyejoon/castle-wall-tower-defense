import { ACHIEVEMENT_MAP } from '@gld/shared';
import { debouncedSave } from './persistence';
import type { MetaActions, SliceCreator } from './types';

export const createAchievementSlice: SliceCreator<
	Pick<MetaActions, 'updateAchievementProgress' | 'claimAchievement' | 'checkAchievements'>
> = (set, get) => ({
	updateAchievementProgress: (id, value) => {
		set((s) => ({
			progress: {
				...s.progress,
				achievements: {
					...s.progress.achievements,
					progress: {
						...s.progress.achievements.progress,
						[id]: Math.max(s.progress.achievements.progress[id] ?? 0, value),
					},
				},
			},
		}));
		debouncedSave(get());
	},

	claimAchievement: (id) => {
		const state = get();
		if (state.progress.achievements.claimed.includes(id)) return 'already_claimed';
		const def = ACHIEVEMENT_MAP[id];
		if (!def) return 'not_ready';
		const progress = state.progress.achievements.progress[id] ?? 0;
		if (progress < def.target) return 'not_ready';

		set((s) => ({
			profile: { ...s.profile, diamond: s.profile.diamond + def.reward.diamond },
			progress: {
				...s.progress,
				achievements: {
					...s.progress.achievements,
					claimed: [...s.progress.achievements.claimed, id],
				},
			},
		}));
		debouncedSave(get());
		return 'success';
	},

	checkAchievements: () => {
		const state = get();
		const { progress: achProgress, claimed } = state.progress.achievements;
		const newlyAchieved: string[] = [];
		for (const [id, value] of Object.entries(achProgress)) {
			const def = ACHIEVEMENT_MAP[id];
			if (def && value >= def.target && !claimed.includes(id)) {
				newlyAchieved.push(id);
			}
		}
		return newlyAchieved;
	},
});
