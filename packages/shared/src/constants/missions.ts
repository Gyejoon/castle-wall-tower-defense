import type { MissionProgress, MissionType } from '../types/save';

interface MissionTemplate {
	type: MissionType;
	targetRange: [number, number]; // min~max에서 랜덤 선택
	reward: { type: 'diamond' | 'gold'; amount: number };
}

// reach_wave: 런마다 새로운 최고 웨이브 갱신 시 누적 카운트 (+1/wave)
// 1판 10웨이브 클리어 시 최대 10 획득 → [50, 80] = 약 5~8판 필요
const DAILY_TEMPLATES: MissionTemplate[] = [
	{
		type: 'reach_wave',
		targetRange: [50, 80],
		reward: { type: 'diamond', amount: 15 },
	},
	{
		type: 'place_towers',
		targetRange: [100, 200],
		reward: { type: 'diamond', amount: 10 },
	},
	{
		type: 'defeat_boss',
		targetRange: [10, 10],
		reward: { type: 'diamond', amount: 30 },
	},
	{
		type: 'attendance',
		targetRange: [1, 1],
		reward: { type: 'diamond', amount: 5 },
	},
];

// 주간: 7일 기준 꾸준한 플레이 전제 (하루 2~3판)
// place_towers: 10x = 500~1000으로 무리 → [200, 300]으로 상한 캡
const WEEKLY_TEMPLATES: MissionTemplate[] = [
	{
		type: 'clear_stage',
		targetRange: [30, 50],
		reward: { type: 'diamond', amount: 80 },
	},
	{
		type: 'place_towers',
		targetRange: [200, 300],
		reward: { type: 'diamond', amount: 50 },
	},
	{
		type: 'defeat_boss',
		targetRange: [30, 50],
		reward: { type: 'diamond', amount: 100 },
	},
	{
		type: 'attendance',
		targetRange: [5, 5],
		reward: { type: 'diamond', amount: 30 },
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
	attendance: '출석 체크',
};
