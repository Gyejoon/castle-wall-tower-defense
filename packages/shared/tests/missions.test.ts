import { describe, expect, it } from 'vitest';
import {
	generateDailyMissions,
	generateWeeklyMissions,
	MISSION_LABELS,
	shouldResetDaily,
	shouldResetWeekly,
} from '../src/index';

describe('generateDailyMissions', () => {
	it('3개 미션 반환', () => {
		const missions = generateDailyMissions();
		expect(missions).toHaveLength(3);
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
		// reach_wave: min=5
		expect(missions[0].target).toBe(5);
		// place_towers: min=10
		expect(missions[1].target).toBe(10);
	});
});

describe('generateWeeklyMissions', () => {
	it('3개 미션 반환', () => {
		const missions = generateWeeklyMissions();
		expect(missions).toHaveLength(3);
	});

	it('id가 weekly-{i} 형식', () => {
		const missions = generateWeeklyMissions();
		expect(missions[0].id).toBe('weekly-0');
	});
});

describe('shouldResetDaily', () => {
	it('lastResetAt=null → true', () => {
		expect(shouldResetDaily(null, new Date())).toBe(true);
	});

	it('같은 UTC 날짜 → false', () => {
		const now = new Date('2026-04-06T12:00:00Z');
		const last = '2026-04-06T01:00:00Z';
		expect(shouldResetDaily(last, now)).toBe(false);
	});

	it('다음 UTC 날짜 → true', () => {
		const now = new Date('2026-04-07T00:00:01Z');
		const last = '2026-04-06T23:59:59Z';
		expect(shouldResetDaily(last, now)).toBe(true);
	});
});

describe('shouldResetWeekly', () => {
	it('lastResetAt=null → true', () => {
		expect(shouldResetWeekly(null, new Date())).toBe(true);
	});

	it('같은 주 → false (월요일 기준)', () => {
		// 2026-04-06은 월요일
		const now = new Date('2026-04-08T12:00:00Z'); // 수요일
		const last = '2026-04-06T10:00:00Z'; // 월요일
		expect(shouldResetWeekly(last, now)).toBe(false);
	});

	it('다음 주 → true', () => {
		// 2026-04-13은 다음 월요일
		const now = new Date('2026-04-13T00:00:01Z');
		const last = '2026-04-06T10:00:00Z';
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
