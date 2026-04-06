import { describe, expect, it } from 'vitest';
import {
	generateDailyMissions,
	generateWeeklyMissions,
	MISSION_LABELS,
	shouldResetDaily,
	shouldResetWeekly,
} from '../src/index';

describe('generateDailyMissions', () => {
	it('4개 미션 반환', () => {
		const missions = generateDailyMissions();
		expect(missions).toHaveLength(4);
	});

	it('id가 daily-{i} 형식', () => {
		const missions = generateDailyMissions();
		expect(missions[0].id).toBe('daily-0');
		expect(missions[1].id).toBe('daily-1');
		expect(missions[2].id).toBe('daily-2');
	});

	it('current=0, claimed=false 초기값', () => {
		const missions = generateDailyMissions();
		for (const m of missions) {
			expect(m.current).toBe(0);
			expect(m.claimed).toBe(false);
		}
	});

	it('target이 targetRange 내에 있음', () => {
		const rng = () => 0; // 항상 min
		const missions = generateDailyMissions(rng);
		// reach_wave: min=50
		expect(missions[0].target).toBe(50);
		// place_towers: min=100
		expect(missions[1].target).toBe(100);
	});
});

describe('generateWeeklyMissions', () => {
	it('4개 미션 반환', () => {
		const missions = generateWeeklyMissions();
		expect(missions).toHaveLength(4);
	});

	it('id가 weekly-{i} 형식', () => {
		const missions = generateWeeklyMissions();
		expect(missions[0].id).toBe('weekly-0');
	});
});

// KST = UTC+9. KST 자정 = UTC 15:00 (전날)
describe('shouldResetDaily', () => {
	it('lastResetAt=null → true', () => {
		expect(shouldResetDaily(null, new Date())).toBe(true);
	});

	it('같은 KST 날짜 → false', () => {
		// KST 2026-04-06 09:00 ~ 21:00 — 같은 KST 날
		const now = new Date('2026-04-06T12:00:00Z'); // KST 21:00
		const last = '2026-04-06T00:00:00Z'; // KST 09:00
		expect(shouldResetDaily(last, now)).toBe(false);
	});

	it('KST 자정 직후 → true', () => {
		// KST 자정 = UTC 15:00 (전날)
		// last: KST 2026-04-06 23:59 = UTC 2026-04-06T14:59Z
		// now:  KST 2026-04-07 00:01 = UTC 2026-04-06T15:01Z
		const now = new Date('2026-04-06T15:01:00Z'); // KST 2026-04-07 00:01
		const last = '2026-04-06T14:59:00Z'; // KST 2026-04-06 23:59
		expect(shouldResetDaily(last, now)).toBe(true);
	});

	it('UTC 자정이어도 KST 같은 날이면 → false', () => {
		// UTC 자정(2026-04-07T00:00Z) = KST 09:00 — 여전히 같은 KST 날
		const now = new Date('2026-04-07T00:00:01Z'); // KST 2026-04-07 09:00
		const last = '2026-04-06T23:59:59Z'; // KST 2026-04-07 08:59
		expect(shouldResetDaily(last, now)).toBe(false);
	});
});

describe('shouldResetWeekly', () => {
	it('lastResetAt=null → true', () => {
		expect(shouldResetWeekly(null, new Date())).toBe(true);
	});

	it('같은 KST 주 → false', () => {
		// KST 기준 2026-04-06(월) ~ 2026-04-08(수) 같은 주
		const now = new Date('2026-04-08T12:00:00Z'); // KST 수요일 21:00
		const last = '2026-04-06T10:00:00Z'; // KST 월요일 19:00
		expect(shouldResetWeekly(last, now)).toBe(false);
	});

	it('KST 월요일 자정 직후 → true', () => {
		// KST 월요일 자정 = UTC 일요일 15:00
		// last: KST 2026-04-06(월) 이전 주
		// now:  KST 2026-04-13(월) 00:01 = UTC 2026-04-12T15:01Z
		const now = new Date('2026-04-12T15:01:00Z'); // KST 2026-04-13(월) 00:01
		const last = '2026-04-06T10:00:00Z'; // 이전 주 KST 월요일
		expect(shouldResetWeekly(last, now)).toBe(true);
	});
});

describe('MISSION_LABELS', () => {
	it('5개 타입 모두 라벨 존재', () => {
		expect(MISSION_LABELS.reach_wave).toBeTruthy();
		expect(MISSION_LABELS.place_towers).toBeTruthy();
		expect(MISSION_LABELS.defeat_boss).toBeTruthy();
		expect(MISSION_LABELS.clear_stage).toBeTruthy();
		expect(MISSION_LABELS.use_element).toBeTruthy();
	});
});
