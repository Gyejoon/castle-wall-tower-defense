// @vitest-environment jsdom
// Phase 7 (v8): migration tests focused on scenario-field drop + highestWave
// collapse. Older version paths now pipe through v7→v8 at the end; we only
// guarantee data-preserving v7→v8 here and that later-version saves round-
// trip cleanly.

import { createDefaultSave, SAVE_STORAGE_KEY, SAVE_VERSION } from '@gld/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { migrateV7toV8 } from '../meta/migrations/v8';
import { parseSave, sanitizeSave } from '../meta/persistence';
import { useMetaStore } from '../metaStore';

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

describe('migrateV7toV8 (scenario-field drop)', () => {
	it('bumps version and strips scenario progress fields', () => {
		const v7 = {
			version: 7,
			progress: {
				highestWave: { w1_s1: 5, w2_s1: 10, phase_a_s1: 25 },
				stagesCleared: ['w1_s1'],
				totalBattles: 7,
				tutorialCompleted: true,
				gachaPityCount: 4,
				dailyFreeBoxClaimedAt: '2026-01-01T00:00:00.000Z',
				dailyAdBoxCount: 2,
				dailyResetAt: '2026-01-01T00:00:00.000Z',
				dailyMissions: [{ id: 'daily-0' }],
				weeklyMissions: [{ id: 'weekly-0' }],
				lastDailyMissionResetAt: '2026-01-01T00:00:00.000Z',
				lastWeeklyMissionResetAt: '2026-01-01T00:00:00.000Z',
				lastAttendanceDate: '2026-01-01',
				stageStars: { w1_s1: 3 },
				achievements: { claimed: ['cp_100'], progress: { cp_100: 100 } },
				awakeningStones: 7,
			},
		};

		const v8 = migrateV7toV8(v7);

		expect(v8.version).toBe(8);
		const progress = v8.progress as Record<string, unknown>;
		expect(progress.highestWave).toBe(25); // collapses to max
		expect(progress.totalBattles).toBe(7);
		expect(progress.tutorialCompleted).toBe(true);
		expect(progress.gachaPityCount).toBe(4);
		expect(progress.dailyAdBoxCount).toBe(2);

		// scenario-only fields gone
		for (const k of [
			'stagesCleared',
			'dailyMissions',
			'weeklyMissions',
			'lastDailyMissionResetAt',
			'lastWeeklyMissionResetAt',
			'lastAttendanceDate',
			'stageStars',
			'achievements',
			'awakeningStones',
		]) {
			expect(progress[k]).toBeUndefined();
		}
	});

	it('accepts a missing progress block without throwing', () => {
		const v8 = migrateV7toV8({ version: 7 });
		expect(v8.version).toBe(8);
		const progress = v8.progress as Record<string, unknown>;
		expect(progress.highestWave).toBe(0);
		expect(progress.totalBattles).toBe(0);
		expect(progress.tutorialCompleted).toBe(false);
	});

	it('accepts highestWave already being a scalar', () => {
		const v8 = migrateV7toV8({
			version: 7,
			progress: { highestWave: 42 },
		});
		const progress = v8.progress as Record<string, unknown>;
		expect(progress.highestWave).toBe(42);
	});

	it('strips scenario-only top-level fields (selectedStageId etc.)', () => {
		const v8 = migrateV7toV8({
			version: 7,
			selectedStageId: 'w1_s3',
			selectedWorldId: 'w1_forest',
			deckCards: [],
			worldUnlocks: {},
		});
		expect(v8.selectedStageId).toBeUndefined();
		expect(v8.selectedWorldId).toBeUndefined();
		expect(v8.deckCards).toBeUndefined();
		expect(v8.worldUnlocks).toBeUndefined();
	});
});

describe('parseSave end-to-end — v7 save upgrades to current', () => {
	beforeEach(() => {
		useMetaStore.setState(createDefaultSave());
	});

	it('v7 save with scenario fields migrates to v8 cleanly', () => {
		const v7Save = {
			version: 7,
			profile: {
				nickname: 'Tester',
				level: 3,
				xp: 200,
				gold: 1000,
				diamond: 50,
				totalGoldEarned: 2000,
				wins: 5,
				losses: 2,
				winStreak: 2,
				bestWinStreak: 3,
			},
			collection: [
				{
					defId: 'archer',
					level: 3,
					tier: 1,
					acquiredAt: Date.now(),
					awakening: 0,
					duplicateCount: 0,
				},
			],
			progress: {
				highestWave: { w1_s1: 5, phase_a_s1: 17 },
				stagesCleared: ['w1_s1'],
				totalBattles: 7,
				tutorialCompleted: true,
				gachaPityCount: 4,
				dailyFreeBoxClaimedAt: null,
				dailyAdBoxCount: 0,
				dailyResetAt: null,
				dailyMissions: [],
				weeklyMissions: [],
				lastDailyMissionResetAt: null,
				lastWeeklyMissionResetAt: null,
				lastAttendanceDate: null,
				stageStars: { w1_s1: 3 },
				achievements: { claimed: [], progress: {} },
				awakeningStones: 1,
			},
			settings: {
				bgmVolume: 0.5,
				sfxVolume: 0.5,
				screenShake: false,
				colorblindMode: 'off',
			},
			selectedDeck: ['archer', 'emp', 'shield', 'nova_cannon'],
		};

		vi.stubGlobal(
			'localStorage',
			makeLocalStorageMock({ [SAVE_STORAGE_KEY]: JSON.stringify(v7Save) }),
		);

		const parsed = parseSave();
		expect(parsed).not.toBeNull();
		expect(parsed?.version).toBe(SAVE_VERSION);
		expect(parsed?.profile.nickname).toBe('Tester');
		expect(parsed?.collection).toHaveLength(1);
		expect(parsed?.progress.highestWave).toBe(17);
		expect(parsed?.progress.tutorialCompleted).toBe(true);
		expect(parsed?.settings.bgmVolume).toBe(0.5);

		vi.unstubAllGlobals();
	});

	it('sanitizeSave fills missing fields from defaults', () => {
		const defaults = createDefaultSave();
		const stub: unknown = {
			...defaults,
			progress: {
				totalBattles: 3,
				tutorialCompleted: true,
			},
		};
		const sanitized = sanitizeSave(stub as Parameters<typeof sanitizeSave>[0]);
		expect(sanitized.progress.highestWave).toBe(0);
		expect(sanitized.progress.totalBattles).toBe(3);
	});
});
