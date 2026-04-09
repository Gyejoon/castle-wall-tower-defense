import { ACHIEVEMENT_MAP } from '@gld/shared';
import { useMetaStore } from '../stores/metaStore';

export interface ClaimableCounts {
	claimableMissions: number;
	claimableAchievements: number;
}

/**
 * 로비 뱃지용 — 수령 가능한 임무/업적 카운트.
 *
 * NOTE: 두 selector를 분리해 호출한다 — 객체 리터럴을 반환하면
 * Zustand 기본 Object.is 비교에서 매번 새 객체로 인식되어
 * 무한 re-render를 유발하기 때문.
 */
export function useClaimableCounts(): ClaimableCounts {
	const claimableMissions = useMetaStore((s) => {
		const daily = s.progress.dailyMissions.filter(
			(m) => m.current >= m.target && !m.claimed,
		).length;
		const weekly = s.progress.weeklyMissions.filter(
			(m) => m.current >= m.target && !m.claimed,
		).length;
		return daily + weekly;
	});

	const claimableAchievements = useMetaStore((s) => {
		const { progress: achProgress, claimed } = s.progress.achievements;
		let count = 0;
		for (const id of Object.keys(ACHIEVEMENT_MAP)) {
			const def = ACHIEVEMENT_MAP[id];
			if (!def) continue;
			const cur = achProgress[id] ?? 0;
			if (cur >= def.target && !claimed.includes(id)) {
				count += 1;
			}
		}
		return count;
	});

	return { claimableMissions, claimableAchievements };
}
