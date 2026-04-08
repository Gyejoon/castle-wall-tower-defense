// @vitest-environment jsdom
// Migration tests for metaStore v1→v3
// Amendment M from 2026-04-06-phase4-engagement-systems.md

import {
	createDefaultSave,
	generateWeeklyMissions,
	SAVE_STORAGE_KEY,
	SAVE_VERSION,
} from '@gld/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMetaStore } from '../metaStore';

// localStorage mock helper
function makeLocalStorageMock(initial: Record<string, string> = {}): Storage {
	const store: Record<string, string> = { ...initial };
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, val: string) => {
			store[key] = val;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			for (const k in store) delete store[k];
		},
		get length() {
			return Object.keys(store).length;
		},
		key: (i: number) => Object.keys(store)[i] ?? null,
	} as Storage;
}

describe('metaStore v1→v3 migration', () => {
	beforeEach(() => {
		useMetaStore.setState(createDefaultSave());
	});

	it('v1 정상 데이터 → v3으로 마이그레이션', () => {
		const v1Save = {
			version: 1,
			profile: {
				nickname: 'Tester',
				level: 3,
				xp: 200,
				gold: 1000,
				totalGoldEarned: 2000,
				wins: 5,
				losses: 2,
				winStreak: 2,
				bestWinStreak: 3,
			},
			collection: [],
			progress: {
				highestWave: { forest_gate: 5 },
				stagesCleared: [],
				totalBattles: 7,
			},
			settings: {
				soundEnabled: true,
				screenShake: true,
				showDamageNumbers: false,
			},
			selectedDeck: ['archer', 'plasma', 'emp', 'shield'],
		};
		vi.stubGlobal(
			'localStorage',
			makeLocalStorageMock({ [SAVE_STORAGE_KEY]: JSON.stringify(v1Save) }),
		);

		useMetaStore.getState().loadSave();
		const s = useMetaStore.getState();

		expect(s.version).toBe(SAVE_VERSION);
		expect(s.version).toBe(3);
		expect(s.profile.nickname).toBe('Tester');
		expect(s.profile.level).toBe(3);
		expect(s.profile.diamond).toBe(0);
		expect(s.progress.gachaPityCount).toBe(0);
		expect(s.progress.dailyMissions).toEqual([]);
		expect(s.progress.weeklyMissions).toEqual([]);
		expect(s.progress.tutorialCompleted).toBe(false);
		expect(s.progress.highestWave).toEqual({ forest_gate: 5 });
		expect(s.settings.bgmVolume).toBe(0.7);
		expect(s.settings.sfxVolume).toBe(0.8);
		expect(s.settings.showDamageNumbers).toBe(false);
		expect(s.settings.colorblindMode).toBe('off');

		vi.unstubAllGlobals();
	});

	it('soundEnabled=false → bgmVolume 0, sfxVolume 0', () => {
		const v1Save = {
			version: 1,
			profile: {
				nickname: 'Silent',
				level: 1,
				xp: 0,
				gold: 500,
				totalGoldEarned: 0,
				wins: 0,
				losses: 0,
				winStreak: 0,
				bestWinStreak: 0,
			},
			collection: [],
			progress: { highestWave: {}, stagesCleared: [], totalBattles: 0 },
			settings: {
				soundEnabled: false,
				screenShake: true,
				showDamageNumbers: true,
			},
			selectedDeck: [],
		};
		vi.stubGlobal(
			'localStorage',
			makeLocalStorageMock({ [SAVE_STORAGE_KEY]: JSON.stringify(v1Save) }),
		);

		useMetaStore.getState().loadSave();
		const s = useMetaStore.getState();

		expect(s.settings.bgmVolume).toBe(0);
		expect(s.settings.sfxVolume).toBe(0);

		vi.unstubAllGlobals();
	});

	it('progress 필드 누락된 v1 → 기본값으로 채움', () => {
		const v1Partial = {
			version: 1,
			profile: {
				nickname: 'Partial',
				level: 1,
				xp: 0,
				gold: 500,
				totalGoldEarned: 0,
				wins: 0,
				losses: 0,
				winStreak: 0,
				bestWinStreak: 0,
			},
			collection: [],
			progress: { highestWave: {}, stagesCleared: [] },
			settings: {
				soundEnabled: true,
				screenShake: false,
				showDamageNumbers: true,
			},
			selectedDeck: [],
		};
		vi.stubGlobal(
			'localStorage',
			makeLocalStorageMock({ [SAVE_STORAGE_KEY]: JSON.stringify(v1Partial) }),
		);

		useMetaStore.getState().loadSave();
		const s = useMetaStore.getState();

		expect(s.version).toBe(3);
		// v1에 없던 새 필드가 기본값으로 채워짐
		expect(s.progress.gachaPityCount).toBe(0);
		expect(s.progress.lastAttendanceDate).toBeNull();
		expect(s.progress.dailyMissions).toEqual([]);
		expect(s.settings.screenShake).toBe(false);

		vi.unstubAllGlobals();
	});

	it('corrupt JSON → 기본 세이브로 폴백', () => {
		vi.stubGlobal(
			'localStorage',
			makeLocalStorageMock({ [SAVE_STORAGE_KEY]: 'not-valid-json{{{' }),
		);

		useMetaStore.getState().loadSave();
		const s = useMetaStore.getState();

		expect(s.version).toBe(SAVE_VERSION);
		expect(s.profile.nickname).toBe('Commander');
		expect(s.profile.gold).toBe(500);
		expect(s.profile.diamond).toBe(0);

		vi.unstubAllGlobals();
	});

	it('v2 데이터 → v3으로 마이그레이션 (lastAttendanceDate 추가)', () => {
		const v2Save = {
			version: 2,
			profile: {
				nickname: 'V2User',
				level: 5,
				xp: 300,
				gold: 2000,
				diamond: 50,
				totalGoldEarned: 5000,
				wins: 10,
				losses: 3,
				winStreak: 4,
				bestWinStreak: 6,
			},
			collection: [],
			progress: {
				highestWave: {},
				stagesCleared: [],
				totalBattles: 13,
				tutorialCompleted: true,
				gachaPityCount: 12,
				dailyFreeBoxClaimedAt: null,
				dailyAdBoxCount: 1,
				dailyResetAt: null,
				dailyMissions: [],
				weeklyMissions: [],
				lastDailyMissionResetAt: null,
				lastWeeklyMissionResetAt: null,
			},
			settings: {
				bgmVolume: 0.5,
				sfxVolume: 0.6,
				screenShake: true,
				showDamageNumbers: true,
				colorblindMode: 'off',
			},
			selectedDeck: ['archer'],
		};
		vi.stubGlobal(
			'localStorage',
			makeLocalStorageMock({ [SAVE_STORAGE_KEY]: JSON.stringify(v2Save) }),
		);

		useMetaStore.getState().loadSave();
		const s = useMetaStore.getState();

		expect(s.version).toBe(3);
		expect(s.profile.diamond).toBe(50);
		expect(s.profile.nickname).toBe('V2User');
		expect(s.progress.gachaPityCount).toBe(12);
		expect(s.progress.tutorialCompleted).toBe(true);
		expect(s.settings.bgmVolume).toBe(0.5);
		expect(s.progress.lastAttendanceDate).toBeNull();

		vi.unstubAllGlobals();
	});
});

describe('recordAttendance', () => {
	beforeEach(() => {
		const save = createDefaultSave();
		save.progress.weeklyMissions = generateWeeklyMissions();
		useMetaStore.setState(save);
	});

	it('첫 출석 시 attendance current 1 증가, lastAttendanceDate 기록', () => {
		vi.stubGlobal('localStorage', makeLocalStorageMock());
		useMetaStore.getState().recordAttendance();
		const s = useMetaStore.getState();
		const att = s.progress.weeklyMissions.find((m) => m.type === 'attendance');
		expect(att?.current).toBe(1);
		expect(s.progress.lastAttendanceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		vi.unstubAllGlobals();
	});

	it('같은 날 두 번 호출해도 current 1 유지', () => {
		vi.stubGlobal('localStorage', makeLocalStorageMock());
		useMetaStore.getState().recordAttendance();
		useMetaStore.getState().recordAttendance();
		const att = useMetaStore
			.getState()
			.progress.weeklyMissions.find((m) => m.type === 'attendance');
		expect(att?.current).toBe(1);
		vi.unstubAllGlobals();
	});

	it('claimed 상태면 카운팅 안 함', () => {
		vi.stubGlobal('localStorage', makeLocalStorageMock());
		useMetaStore.setState((s) => ({
			progress: {
				...s.progress,
				weeklyMissions: s.progress.weeklyMissions.map((m) =>
					m.type === 'attendance' ? { ...m, claimed: true } : m,
				),
			},
		}));
		useMetaStore.getState().recordAttendance();
		const att = useMetaStore
			.getState()
			.progress.weeklyMissions.find((m) => m.type === 'attendance');
		expect(att?.current).toBe(0);
		vi.unstubAllGlobals();
	});
});
