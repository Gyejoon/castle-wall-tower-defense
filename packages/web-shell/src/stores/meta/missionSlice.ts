import {
	DAILY_MISSION_TYPES,
	generateDailyMissions,
	generateWeeklyMissions,
	shouldResetDaily,
	shouldResetWeekly,
	WEEKLY_MISSION_TYPES,
} from '@gld/shared';
import { debouncedSave } from './persistence';
import type { MetaActions, SliceCreator } from './types';

export const createMissionSlice: SliceCreator<
	Pick<MetaActions, 'refreshMissions' | 'progressMission' | 'claimMission'>
> = (set, get) => ({
	refreshMissions: () => {
		const now = new Date();
		set((s) => {
			const progress = s.progress;
			const needsDailyReset = shouldResetDaily(
				progress.lastDailyMissionResetAt,
				now,
			);
			const needsWeeklyReset = shouldResetWeekly(
				progress.lastWeeklyMissionResetAt,
				now,
			);
			// 미션 타입 추가/제거 모두 감지 — 개수 불일치 or 타입 누락 시 강제 재생성
			const dailyStale =
				needsDailyReset ||
				progress.dailyMissions.length !== DAILY_MISSION_TYPES.length ||
				DAILY_MISSION_TYPES.some(
					(type) => !progress.dailyMissions.some((m) => m.type === type),
				);
			const weeklyStale =
				needsWeeklyReset ||
				progress.weeklyMissions.length !== WEEKLY_MISSION_TYPES.length ||
				WEEKLY_MISSION_TYPES.some(
					(type) => !progress.weeklyMissions.some((m) => m.type === type),
				);

			if (!dailyStale && !weeklyStale) return {};

			return {
				progress: {
					...progress,
					dailyMissions: dailyStale
						? generateDailyMissions()
						: progress.dailyMissions,
					lastDailyMissionResetAt: dailyStale
						? now.toISOString()
						: progress.lastDailyMissionResetAt,
					weeklyMissions: weeklyStale
						? generateWeeklyMissions()
						: progress.weeklyMissions,
					lastWeeklyMissionResetAt: weeklyStale
						? now.toISOString()
						: progress.lastWeeklyMissionResetAt,
					lastAttendanceDate: needsWeeklyReset
						? null
						: progress.lastAttendanceDate,
				},
			};
		});
		debouncedSave(get());
	},

	progressMission: (type, amount, mapId?) => {
		set((s) => {
			const updateList = (missions: typeof s.progress.dailyMissions) =>
				missions.map((m) => {
					if (m.type !== type || m.claimed) return m;
					// For map-bound missions, only progress if mapId matches
					if (m.mapId && m.mapId !== mapId) return m;
					return { ...m, current: Math.min(m.current + amount, m.target) };
				});
			return {
				progress: {
					...s.progress,
					dailyMissions: updateList(s.progress.dailyMissions),
					weeklyMissions: updateList(s.progress.weeklyMissions),
				},
			};
		});
		debouncedSave(get());
	},

	claimMission: (missionId, period) => {
		// guard는 set() 내부에서 원자적으로 수행 (double-tap 방지)
		// eslint-disable-next-line prefer-const -- TS가 클로저 내 mutation을 추적 못해 as 캐스트 필요
		let outcome = 'not_found' as 'success' | 'not_ready' | 'not_found';
		set((s) => {
			const list =
				period === 'daily'
					? s.progress.dailyMissions
					: s.progress.weeklyMissions;
			const mission = list.find((m) => m.id === missionId);
			if (!mission) {
				outcome = 'not_found';
				return s;
			}
			if (mission.claimed || mission.current < mission.target) {
				outcome = 'not_ready';
				return s;
			}

			outcome = 'success';
			const updateList = (missions: typeof list) =>
				missions.map((m) => (m.id === missionId ? { ...m, claimed: true } : m));
			return {
				profile: {
					...s.profile,
					gold:
						mission.reward.type === 'gold'
							? s.profile.gold + mission.reward.amount
							: s.profile.gold,
					totalGoldEarned:
						mission.reward.type === 'gold'
							? s.profile.totalGoldEarned + mission.reward.amount
							: s.profile.totalGoldEarned,
					diamond:
						mission.reward.type === 'diamond'
							? s.profile.diamond + mission.reward.amount
							: s.profile.diamond,
				},
				progress: {
					...s.progress,
					dailyMissions:
						period === 'daily'
							? updateList(s.progress.dailyMissions)
							: s.progress.dailyMissions,
					weeklyMissions:
						period === 'weekly'
							? updateList(s.progress.weeklyMissions)
							: s.progress.weeklyMissions,
				},
			};
		});
		if (outcome === 'success') debouncedSave(get());
		return outcome;
	},
});
