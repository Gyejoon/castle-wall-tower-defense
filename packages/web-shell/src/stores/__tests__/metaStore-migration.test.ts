// @vitest-environment jsdom
// Migration tests for metaStore v1→v6
// Amendment M from 2026-04-06-phase4-engagement-systems.md

import {
	createDefaultSave,
	generateWeeklyMissions,
	SAVE_STORAGE_KEY,
	SAVE_VERSION,
} from '@gld/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { parseSave, sanitizeSave } from '../meta/persistence';
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

describe('metaStore v1→v6 migration', () => {
	beforeEach(() => {
		useMetaStore.setState(createDefaultSave());
	});

	it('v1 정상 데이터 → v4으로 마이그레이션 (laser→archer 포함)', () => {
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
			selectedDeck: ['laser', 'plasma', 'emp', 'shield'],
		};
		vi.stubGlobal(
			'localStorage',
			makeLocalStorageMock({ [SAVE_STORAGE_KEY]: JSON.stringify(v1Save) }),
		);

		useMetaStore.getState().loadSave();
		const s = useMetaStore.getState();

		expect(s.version).toBe(SAVE_VERSION);
		expect(s.selectedDeck).toEqual(['archer', 'plasma', 'emp', 'shield']);
		expect(s.profile.nickname).toBe('Tester');
		expect(s.profile.level).toBe(3);
		expect(s.profile.diamond).toBe(0);
		expect(s.progress.gachaPityCount).toBe(0);
		expect(s.progress.dailyMissions).toEqual([]);
		expect(s.progress.weeklyMissions).toEqual([]);
		expect(s.progress.tutorialCompleted).toBe(false);
		expect(s.progress.highestWave).toEqual({
			w1_s1: 5,
			w1_s2: 5,
			w1_s3: 5,
			w1_s4: 5,
			w1_s5: 5,
			w1_s6: 5,
			w1_s7: 5,
			w1_s8: 5,
		});
		expect(s.settings.bgmVolume).toBe(0.7);
		expect(s.settings.sfxVolume).toBe(0.8);
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

		expect(s.version).toBe(SAVE_VERSION);
		// v1에 없던 새 필드가 기본값으로 채워짐
		expect(s.progress.gachaPityCount).toBe(0);
		expect(s.progress.lastAttendanceDate).toBeNull();
		expect(s.progress.dailyMissions).toEqual([]);
		expect(s.settings.screenShake).toBe(false);
		expect(s.profile.combatPower).toBe(0);
		expect(s.progress.stageStars).toEqual({});
		expect(s.progress.awakeningStones).toBe(0);

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

		expect(s.version).toBe(SAVE_VERSION);
		expect(s.profile.diamond).toBe(50);
		expect(s.profile.nickname).toBe('V2User');
		expect(s.progress.gachaPityCount).toBe(12);
		expect(s.progress.tutorialCompleted).toBe(true);
		expect(s.settings.bgmVolume).toBe(0.5);
		expect(s.progress.lastAttendanceDate).toBeNull();
		expect(s.profile.combatPower).toBe(0);
		expect(s.progress.stageStars).toEqual({});
		expect(s.progress.awakeningStones).toBe(0);

		vi.unstubAllGlobals();
	});

	it('migrates v3 save: laser→archer, twin_laser→twin_archer', () => {
		const v3Save = {
			version: 3,
			profile: {
				nickname: 'test',
				level: 1,
				xp: 0,
				gold: 100,
				diamond: 0,
				totalGoldEarned: 0,
				wins: 0,
				losses: 0,
				winStreak: 0,
				bestWinStreak: 0,
			},
			collection: [
				{ defId: 'laser', level: 5, grade: 'rare', acquiredAt: 1000 },
				{ defId: 'twin_laser', level: 10, grade: 'epic', acquiredAt: 2000 },
				{ defId: 'plasma', level: 3, grade: 'normal', acquiredAt: 500 },
			],
			progress: {
				highestWave: {},
				stagesCleared: [],
				totalBattles: 0,
				tutorialCompleted: true,
				gachaPityCount: 0,
				dailyFreeBoxClaimedAt: null,
				dailyAdBoxCount: 0,
				dailyResetAt: null,
				dailyMissions: [],
				weeklyMissions: [],
				lastDailyMissionResetAt: null,
				lastWeeklyMissionResetAt: null,
				lastAttendanceDate: null,
			},
			settings: {
				bgmVolume: 0.7,
				sfxVolume: 0.8,
				screenShake: true,
				showDamageNumbers: true,
				colorblindMode: 'off',
			},
			selectedDeck: ['laser', 'plasma', 'emp', 'shield'],
		};

		vi.stubGlobal(
			'localStorage',
			makeLocalStorageMock({ [SAVE_STORAGE_KEY]: JSON.stringify(v3Save) }),
		);
		const result = parseSave();

		expect(result).not.toBeNull();
		expect(result?.version).toBe(SAVE_VERSION);
		expect(result?.selectedDeck).toEqual(['archer', 'plasma', 'emp', 'shield']);
		expect(result?.collection[0].defId).toBe('archer');
		expect(result?.collection[1].defId).toBe('twin_archer');
		expect(result?.collection[2].defId).toBe('plasma'); // unchanged

		vi.unstubAllGlobals();
	});
});

describe('sanitizeSave — v5 필드 누락 방어', () => {
	it('achievements 누락 시 기본값 채움', () => {
		const save = createDefaultSave();
		delete (save.progress as unknown as Record<string, unknown>).achievements;
		const result = sanitizeSave(save);
		expect(result.progress.achievements).toEqual({
			claimed: [],
			progress: {},
		});
	});

	it('stageStars 누락 시 기본값 채움', () => {
		const save = createDefaultSave();
		delete (save.progress as unknown as Record<string, unknown>).stageStars;
		const result = sanitizeSave(save);
		expect(result.progress.stageStars).toEqual({});
	});

	it('collection 아이템에 awakening/duplicateCount 누락 시 기본값 채움', () => {
		const save = createDefaultSave();
		const tower = save.collection[0] as unknown as Record<string, unknown>;
		delete tower.awakening;
		delete tower.duplicateCount;
		const result = sanitizeSave(save);
		expect(result.collection[0].awakening).toBe(0);
		expect(result.collection[0].duplicateCount).toBe(0);
	});

	it('combatPower 누락 시 기본값 채움', () => {
		const save = createDefaultSave();
		delete (save.profile as unknown as Record<string, unknown>).combatPower;
		const result = sanitizeSave(save);
		expect(result.profile.combatPower).toBe(0);
	});

	it('collection이 배열이 아니면 기본 컬렉션으로 대체', () => {
		const save = createDefaultSave();
		(save as unknown as Record<string, unknown>).collection = 'corrupted';
		const result = sanitizeSave(save);
		expect(Array.isArray(result.collection)).toBe(true);
		expect(result.collection.length).toBeGreaterThan(0);
	});

	it('parseSave가 v4 데이터에 sanitization 적용', () => {
		const save = createDefaultSave();
		delete (save.progress as unknown as Record<string, unknown>).achievements;
		delete (save.progress as unknown as Record<string, unknown>).stageStars;
		vi.stubGlobal(
			'localStorage',
			makeLocalStorageMock({
				[SAVE_STORAGE_KEY]: JSON.stringify(save),
			}),
		);
		const result = parseSave();
		expect(result).not.toBeNull();
		expect(result?.progress.achievements).toEqual({
			claimed: [],
			progress: {},
		});
		expect(result?.progress.stageStars).toEqual({});
		vi.unstubAllGlobals();
	});
});

// ── v4 → v5 migration (stageStars mapId → stageId) ──────────────────────────

function makeV4Save(
	stageStars: Record<string, number> = {},
	progressPatch: Partial<ReturnType<typeof createDefaultSave>['progress']> = {},
) {
	const base = createDefaultSave();
	return {
		...base,
		version: 4,
		progress: {
			...base.progress,
			...progressPatch,
			stageStars,
		},
	};
}

describe('save v4→v5 migration: stageStars mapId→stageId', () => {
	it('migrates v4 → v6: version bump', () => {
		const save = makeV4Save({});
		vi.stubGlobal(
			'localStorage',
			makeLocalStorageMock({ [SAVE_STORAGE_KEY]: JSON.stringify(save) }),
		);
		const result = parseSave();
		expect(result).not.toBeNull();
		expect(result?.version).toBe(SAVE_VERSION);
		vi.unstubAllGlobals();
	});

	it('duplicates forest_gate ★2 to w1_s1..w1_s8', () => {
		const save = makeV4Save({ forest_gate: 2 });
		vi.stubGlobal(
			'localStorage',
			makeLocalStorageMock({ [SAVE_STORAGE_KEY]: JSON.stringify(save) }),
		);
		const result = parseSave();
		expect(result).not.toBeNull();
		const stars = result!.progress.stageStars;
		for (let i = 1; i <= 8; i++) {
			expect(stars[`w1_s${i}`]).toBe(2);
		}
		expect(stars.forest_gate).toBeUndefined();
		vi.unstubAllGlobals();
	});

	it('duplicates lava_fortress ★1 to w2_s1..w2_s8', () => {
		const save = makeV4Save({ lava_fortress: 1 });
		vi.stubGlobal(
			'localStorage',
			makeLocalStorageMock({ [SAVE_STORAGE_KEY]: JSON.stringify(save) }),
		);
		const result = parseSave();
		expect(result).not.toBeNull();
		const stars = result!.progress.stageStars;
		for (let i = 1; i <= 8; i++) {
			expect(stars[`w2_s${i}`]).toBe(1);
		}
		expect(stars.lava_fortress).toBeUndefined();
		vi.unstubAllGlobals();
	});

	it('duplicates storm_citadel ★3 to w3_s1..w3_s8', () => {
		const save = makeV4Save({ storm_citadel: 3 });
		vi.stubGlobal(
			'localStorage',
			makeLocalStorageMock({ [SAVE_STORAGE_KEY]: JSON.stringify(save) }),
		);
		const result = parseSave();
		expect(result).not.toBeNull();
		const stars = result!.progress.stageStars;
		for (let i = 1; i <= 8; i++) {
			expect(stars[`w3_s${i}`]).toBe(3);
		}
		expect(stars.storm_citadel).toBeUndefined();
		vi.unstubAllGlobals();
	});

	it('preserves stars already keyed by new stageIds', () => {
		const save = makeV4Save({ w1_s3: 2 });
		vi.stubGlobal(
			'localStorage',
			makeLocalStorageMock({ [SAVE_STORAGE_KEY]: JSON.stringify(save) }),
		);
		const result = parseSave();
		expect(result).not.toBeNull();
		expect(result?.progress.stageStars.w1_s3).toBe(2);
		vi.unstubAllGlobals();
	});

	it('preserves profile/collection/settings unchanged', () => {
		const save = makeV4Save({});
		save.profile.combatPower = 9999;
		save.settings.bgmVolume = 0.3;
		vi.stubGlobal(
			'localStorage',
			makeLocalStorageMock({ [SAVE_STORAGE_KEY]: JSON.stringify(save) }),
		);
		const result = parseSave();
		expect(result).not.toBeNull();
		expect(result?.profile.combatPower).toBe(9999);
		expect(result?.settings.bgmVolume).toBe(0.3);
		vi.unstubAllGlobals();
	});

	it('migrates legacy map-based highestWave and stagesCleared to stage-based progress', () => {
		const save = makeV4Save(
			{ forest_gate: 2 },
			{
				highestWave: { forest_gate: 10 },
				stagesCleared: ['forest_gate'],
			},
		);
		vi.stubGlobal(
			'localStorage',
			makeLocalStorageMock({ [SAVE_STORAGE_KEY]: JSON.stringify(save) }),
		);
		const result = parseSave();
		expect(result).not.toBeNull();
		expect(result?.progress.highestWave.w1_s1).toBe(10);
		expect(result?.progress.highestWave.w1_s8).toBe(10);
		expect(result?.progress.highestWave.forest_gate).toBeUndefined();
		expect(result?.progress.stagesCleared).toContain('w1_s1');
		expect(result?.progress.stagesCleared).toContain('w1_s8');
		expect(result?.progress.stagesCleared).not.toContain('forest_gate');
		vi.unstubAllGlobals();
	});

	it('migrates v5 → v6: removes showDamageNumbers', () => {
		const v5Save = {
			...createDefaultSave(),
			version: 5,
			progress: {
				...createDefaultSave().progress,
				stageStars: { w1_s1: 3, w2_s4: 1 },
			},
			settings: {
				...createDefaultSave().settings,
				showDamageNumbers: true,
			},
		};
		vi.stubGlobal(
			'localStorage',
			makeLocalStorageMock({ [SAVE_STORAGE_KEY]: JSON.stringify(v5Save) }),
		);
		const result = parseSave();
		expect(result).not.toBeNull();
		expect(result?.version).toBe(SAVE_VERSION);
		expect(result?.progress.stageStars).toEqual({ w1_s1: 3, w2_s4: 1 });
		expect(
			(result?.settings as unknown as Record<string, unknown>)
				.showDamageNumbers,
		).toBeUndefined();
		vi.unstubAllGlobals();
	});

	it('idempotent on v6 input: passing v6 save returns same data without re-migration', () => {
		const v6Save = {
			...createDefaultSave(),
			version: SAVE_VERSION,
			progress: {
				...createDefaultSave().progress,
				stageStars: { w1_s1: 3, w2_s4: 1 },
			},
		};
		vi.stubGlobal(
			'localStorage',
			makeLocalStorageMock({ [SAVE_STORAGE_KEY]: JSON.stringify(v6Save) }),
		);
		const result = parseSave();
		expect(result).not.toBeNull();
		expect(result?.version).toBe(SAVE_VERSION);
		expect(result?.progress.stageStars).toEqual({ w1_s1: 3, w2_s4: 1 });
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
