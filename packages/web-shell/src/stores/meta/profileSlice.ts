import { type SaveData, type StarRating, toKSTDateStr, xpToNextLevel } from '@gld/shared';
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
	Pick<
		MetaActions,
		| 'addGold'
		| 'addXp'
		| 'recordBattle'
		| 'updateHighestWave'
		| 'recordStageClear'
		| 'recordStarClear'
		| 'addAwakeningStones'
		| 'recordAttendance'
	>
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

	updateHighestWave: (mapId, wave) => {
		set((s) => ({
			progress: {
				...s.progress,
				highestWave: {
					...s.progress.highestWave,
					[mapId]: Math.max(s.progress.highestWave[mapId] ?? 0, wave),
				},
			},
		}));
		debouncedSave(get());
	},

	recordStageClear: (mapId) => {
		set((s) => {
			if (s.progress.stagesCleared.includes(mapId)) return s;
			return {
				progress: {
					...s.progress,
					stagesCleared: [...s.progress.stagesCleared, mapId],
				},
			};
		});
		debouncedSave(get());
	},

	recordStarClear: (mapId, star) => {
		set((s) => {
			const current = s.progress.stageStars[mapId] ?? 0;
			if (star <= current) return s;
			return {
				progress: {
					...s.progress,
					stageStars: { ...s.progress.stageStars, [mapId]: star },
				},
			};
		});
		debouncedSave(get());
	},

	addAwakeningStones: (amount) => {
		set((s) => ({
			progress: {
				...s.progress,
				awakeningStones: s.progress.awakeningStones + amount,
			},
		}));
		debouncedSave(get());
	},

	recordAttendance: () => {
		const todayKST = toKSTDateStr(new Date());
		set((s) => {
			const att = s.progress.weeklyMissions.find(
				(m) => m.type === 'attendance',
			);
			if (!att || att.claimed || s.progress.lastAttendanceDate === todayKST)
				return s;
			return {
				progress: {
					...s.progress,
					lastAttendanceDate: todayKST,
					weeklyMissions: s.progress.weeklyMissions.map((m) =>
						m.type === 'attendance' && !m.claimed
							? { ...m, current: Math.min(m.current + 1, m.target) }
							: m,
					),
				},
			};
		});
		debouncedSave(get());
	},
});
