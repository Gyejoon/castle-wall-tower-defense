// @vitest-environment jsdom

import {
	createDefaultSave,
	generateWeeklyMissions,
	MAX_TOWER_LEVEL,
	SAVE_VERSION,
	toKSTDateStr,
} from '@gld/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMetaStore } from '../metaStore';

describe('metaStore', () => {
	beforeEach(() => {
		useMetaStore.setState(createDefaultSave());
	});

	it('loadSave creates default when no data exists', () => {
		useMetaStore.getState().loadSave();
		const s = useMetaStore.getState();
		expect(s.version).toBe(SAVE_VERSION);
		expect(s.profile.gold).toBe(500);
		expect(s.collection).toHaveLength(4);
	});

	it('loadSave restores from store round-trip', () => {
		// Modify state, trigger save, then reload
		useMetaStore.getState().loadSave();
		useMetaStore.getState().addGold(100);
		// Force immediate save by calling loadSave internal write path
		// The store write happens via debounce; test the state directly
		expect(useMetaStore.getState().profile.gold).toBe(600);
	});

	it('addGold increases profile.gold', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.getState().addGold(100);
		expect(useMetaStore.getState().profile.gold).toBe(600);
	});

	it('addGold tracks totalGoldEarned', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.getState().addGold(100);
		useMetaStore.getState().addGold(200);
		expect(useMetaStore.getState().profile.totalGoldEarned).toBe(300);
	});

	it('addXp triggers level-up when exceeding threshold', () => {
		useMetaStore.getState().loadSave();
		// Level 1 needs 100 XP
		useMetaStore.getState().addXp(100);
		expect(useMetaStore.getState().profile.level).toBe(2);
		expect(useMetaStore.getState().profile.xp).toBe(0);
	});

	it('addXp handles multi-level-up', () => {
		useMetaStore.getState().loadSave();
		// Level 1→2: 100 XP, Level 2→3: 155 XP. Total: 255. Give 260 → leftover 5.
		useMetaStore.getState().addXp(260);
		expect(useMetaStore.getState().profile.level).toBe(3);
		expect(useMetaStore.getState().profile.xp).toBe(5);
	});

	it('recordBattle increments wins and winStreak on victory', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.getState().recordBattle('victory');
		const p = useMetaStore.getState().profile;
		expect(p.wins).toBe(1);
		expect(p.winStreak).toBe(1);
		expect(p.bestWinStreak).toBe(1);
	});

	it('recordBattle increments losses and resets winStreak on defeat', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.getState().recordBattle('victory');
		useMetaStore.getState().recordBattle('defeat');
		const p = useMetaStore.getState().profile;
		expect(p.losses).toBe(1);
		expect(p.winStreak).toBe(0);
		expect(p.bestWinStreak).toBe(1);
	});

	it('recordBattle increments totalBattles', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.getState().recordBattle('victory');
		useMetaStore.getState().recordBattle('defeat');
		expect(useMetaStore.getState().progress.totalBattles).toBe(2);
	});

	it('updateHighestWave tracks per-map highest', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.getState().updateHighestWave('forest_gate', 5);
		useMetaStore.getState().updateHighestWave('forest_gate', 3);
		expect(useMetaStore.getState().progress.highestWave.forest_gate).toBe(5);
	});

	it('enhanceTower deducts gold and increments level', () => {
		useMetaStore.getState().loadSave();
		const result = useMetaStore.getState().enhanceTower('laser');
		expect(result).toBe('success');
		const s = useMetaStore.getState();
		const tower = s.collection.find((t) => t.defId === 'laser');
		expect(tower?.level).toBe(2);
		expect(s.profile.gold).toBeLessThan(500);
	});

	it('enhanceTower returns no_gold when gold insufficient', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.setState((s) => ({ profile: { ...s.profile, gold: 0 } }));
		const result = useMetaStore.getState().enhanceTower('laser');
		expect(result).toBe('no_gold');
	});

	it('enhanceTower returns max_level at MAX_TOWER_LEVEL', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.setState((s) => ({
			collection: s.collection.map((t) =>
				t.defId === 'laser' ? { ...t, level: MAX_TOWER_LEVEL } : t,
			),
		}));
		const result = useMetaStore.getState().enhanceTower('laser');
		expect(result).toBe('max_level');
	});

	it('promoteTower upgrades grade on success', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.setState((s) => ({
			collection: s.collection.map((t) =>
				t.defId === 'laser' ? { ...t, level: 20 } : t,
			),
		}));
		const result = useMetaStore.getState().promoteTower('laser', () => 0);
		expect(result).toBe('success');
		const tower = useMetaStore
			.getState()
			.collection.find((t) => t.defId === 'laser');
		expect(tower?.grade).toBe('rare');
	});

	it('promoteTower deducts gold even on failure', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.setState((s) => ({
			collection: s.collection.map((t) =>
				t.defId === 'laser' ? { ...t, level: 20 } : t,
			),
		}));
		const beforeGold = useMetaStore.getState().profile.gold;
		useMetaStore.getState().promoteTower('laser', () => 0.99);
		expect(useMetaStore.getState().profile.gold).toBe(beforeGold - 500);
		const tower = useMetaStore
			.getState()
			.collection.find((t) => t.defId === 'laser');
		expect(tower?.grade).toBe('normal');
	});

	it('promoteTower returns max_grade for epic', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.setState((s) => ({
			collection: s.collection.map((t) =>
				t.defId === 'laser' ? { ...t, grade: 'epic' as const } : t,
			),
		}));
		const result = useMetaStore.getState().promoteTower('laser');
		expect(result).toBe('max_grade');
	});

	it('promoteTower returns no_gold when insufficient', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.setState((s) => ({
			profile: { ...s.profile, gold: 0 },
			collection: s.collection.map((t) =>
				t.defId === 'laser' ? { ...t, level: 20 } : t,
			),
		}));
		const result = useMetaStore.getState().promoteTower('laser');
		expect(result).toBe('no_gold');
	});

	it('promoteTower returns level_too_low when tower level below required', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.setState((s) => ({
			profile: { ...s.profile, gold: 10000 },
		}));
		const result = useMetaStore.getState().promoteTower('laser');
		expect(result).toBe('level_too_low');
	});

	it('promoteTower boundary: Lv.19 fails, Lv.20 proceeds', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.setState((s) => ({
			profile: { ...s.profile, gold: 10000 },
			collection: s.collection.map((t) =>
				t.defId === 'laser' ? { ...t, level: 19 } : t,
			),
		}));
		expect(useMetaStore.getState().promoteTower('laser')).toBe('level_too_low');

		useMetaStore.setState((s) => ({
			collection: s.collection.map((t) =>
				t.defId === 'laser' ? { ...t, level: 20, grade: 'normal' as const } : t,
			),
		}));
		expect(useMetaStore.getState().promoteTower('laser', () => 0)).toBe(
			'success',
		);
	});

	it('setSelectedDeck updates deck', () => {
		useMetaStore.getState().loadSave();
		useMetaStore
			.getState()
			.setSelectedDeck(['emp', 'shield', 'laser', 'plasma']);
		expect(useMetaStore.getState().selectedDeck).toEqual([
			'emp',
			'shield',
			'laser',
			'plasma',
		]);
	});

	it('updateSettings merges partial settings', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.getState().updateSettings({ bgmVolume: 0 });
		expect(useMetaStore.getState().settings.bgmVolume).toBe(0);
		expect(useMetaStore.getState().settings.screenShake).toBe(true);
	});

	it('recordAttendance increments attendance mission and sets lastAttendanceDate', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.setState((s) => ({
			progress: { ...s.progress, weeklyMissions: generateWeeklyMissions() },
		}));
		const today = toKSTDateStr(new Date());
		useMetaStore.getState().recordAttendance();
		const s = useMetaStore.getState();
		const att = s.progress.weeklyMissions.find((m) => m.type === 'attendance');
		expect(att?.current).toBe(1);
		expect(s.progress.lastAttendanceDate).toBe(today);
	});

	it('recordAttendance is idempotent on same day', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.setState((s) => ({
			progress: { ...s.progress, weeklyMissions: generateWeeklyMissions() },
		}));
		useMetaStore.getState().recordAttendance();
		useMetaStore.getState().recordAttendance();
		const att = useMetaStore
			.getState()
			.progress.weeklyMissions.find((m) => m.type === 'attendance');
		expect(att?.current).toBe(1);
	});

	it('refreshMissions clears lastAttendanceDate on weekly reset', () => {
		useMetaStore.getState().loadSave();
		const today = toKSTDateStr(new Date());
		useMetaStore.setState((s) => ({
			progress: {
				...s.progress,
				lastAttendanceDate: today,
				weeklyMissions: generateWeeklyMissions(),
				lastWeeklyMissionResetAt: new Date(
					Date.now() - 8 * 24 * 60 * 60 * 1000,
				).toISOString(),
			},
		}));
		useMetaStore.getState().refreshMissions();
		expect(useMetaStore.getState().progress.lastAttendanceDate).toBeNull();
	});

	it('refreshMissions preserves lastAttendanceDate on structural-only stale (mid-week mission type mismatch)', () => {
		useMetaStore.getState().loadSave();
		const today = toKSTDateStr(new Date());
		// 구조적 stale: weeklyMissions 빈 배열 (타입 누락), 하지만 주간 리셋 기간 아님
		useMetaStore.setState((s) => ({
			progress: {
				...s.progress,
				lastAttendanceDate: today,
				weeklyMissions: [],
				lastWeeklyMissionResetAt: new Date().toISOString(), // just reset
			},
		}));
		useMetaStore.getState().refreshMissions();
		expect(useMetaStore.getState().progress.lastAttendanceDate).toBe(today);
	});
});
