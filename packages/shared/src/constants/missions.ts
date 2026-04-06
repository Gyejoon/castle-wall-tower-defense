import type { MissionProgress, MissionType } from '../types/save';

interface MissionTemplate {
	type: MissionType;
	targetRange: [number, number]; // min~max에서 랜덤 선택
	reward: { type: 'diamond' | 'gold'; amount: number };
}

// reach_wave: 단일 런에서 웨이브 N에 도달 (누적 아님)
const DAILY_TEMPLATES: MissionTemplate[] = [
	{
		type: 'reach_wave',
		targetRange: [5, 8],
		reward: { type: 'diamond', amount: 15 },
	},
	{
		type: 'place_towers',
		targetRange: [10, 20],
		reward: { type: 'diamond', amount: 10 },
	},
	{
		type: 'defeat_boss',
		targetRange: [1, 1],
		reward: { type: 'diamond', amount: 30 },
	},
];

const WEEKLY_TEMPLATES: MissionTemplate[] = [
	{
		type: 'clear_stage',
		targetRange: [3, 5],
		reward: { type: 'diamond', amount: 80 },
	},
	{
		type: 'place_towers',
		targetRange: [50, 100],
		reward: { type: 'diamond', amount: 50 },
	},
	{
		type: 'defeat_boss',
		targetRange: [3, 5],
		reward: { type: 'diamond', amount: 100 },
	},
];

export function generateDailyMissions(rng = Math.random): MissionProgress[] {
	return DAILY_TEMPLATES.map((t, i) => ({
		id: `daily-${i}`,
		type: t.type,
		target:
			t.targetRange[0] +
			Math.floor(rng() * (t.targetRange[1] - t.targetRange[0] + 1)),
		current: 0,
		reward: t.reward,
		claimed: false,
	}));
}

export function generateWeeklyMissions(rng = Math.random): MissionProgress[] {
	return WEEKLY_TEMPLATES.map((t, i) => ({
		id: `weekly-${i}`,
		type: t.type,
		target:
			t.targetRange[0] +
			Math.floor(rng() * (t.targetRange[1] - t.targetRange[0] + 1)),
		current: 0,
		reward: t.reward,
		claimed: false,
	}));
}

export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function toKSTDate(d: Date): Date {
	return new Date(d.getTime() + KST_OFFSET_MS);
}

export function shouldResetDaily(
	lastResetAt: string | null,
	now: Date,
): boolean {
	if (!lastResetAt) return true;
	const lastKST = toKSTDate(new Date(lastResetAt));
	const nowKST = toKSTDate(now);
	const lastDay = Date.UTC(
		lastKST.getUTCFullYear(),
		lastKST.getUTCMonth(),
		lastKST.getUTCDate(),
	);
	const nowDay = Date.UTC(
		nowKST.getUTCFullYear(),
		nowKST.getUTCMonth(),
		nowKST.getUTCDate(),
	);
	return nowDay > lastDay;
}

export function shouldResetWeekly(
	lastResetAt: string | null,
	now: Date,
): boolean {
	if (!lastResetAt) return true;
	const lastKST = toKSTDate(new Date(lastResetAt));
	const nowKST = toKSTDate(now);
	// 월요일 KST 0시 기준
	const getMondayKST = (d: Date) => {
		const day = d.getUTCDay();
		const diff = day === 0 ? 6 : day - 1;
		return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diff);
	};
	return getMondayKST(nowKST) > getMondayKST(lastKST);
}

export const MISSION_LABELS: Record<MissionType, string> = {
	reach_wave: '웨이브 도달',
	place_towers: '타워 배치',
	defeat_boss: '보스 처치',
	clear_stage: '스테이지 클리어',
	use_element: '속성 타워 사용',
};
