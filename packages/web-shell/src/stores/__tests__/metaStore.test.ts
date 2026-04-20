// @vitest-environment jsdom

import {
	createDefaultSave,
	dupesRequiredForLevel,
	MAX_TOWER_LEVEL,
	SAVE_VERSION,
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

	it('updateHighestWave keeps the maximum across calls', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.getState().updateHighestWave(5);
		useMetaStore.getState().updateHighestWave(3);
		expect(useMetaStore.getState().progress.highestWave).toBe(5);
		useMetaStore.getState().updateHighestWave(8);
		expect(useMetaStore.getState().progress.highestWave).toBe(8);
	});

	it('enhanceTower consumes gold + dupes and increments level', () => {
		useMetaStore.getState().loadSave();
		// 1→2는 dupe 1개 필요
		useMetaStore.setState((s) => ({
			collection: s.collection.map((t) =>
				t.defId === 'archer' ? { ...t, duplicateCount: 5 } : t,
			),
		}));
		const result = useMetaStore.getState().enhanceTower('archer');
		expect(result).toBe('success');
		const s = useMetaStore.getState();
		const tower = s.collection.find((t) => t.defId === 'archer');
		expect(tower?.level).toBe(2);
		expect(tower?.duplicateCount).toBe(4);
		expect(s.profile.gold).toBeLessThan(500);
	});

	it('enhanceTower dupe 요구량이 레벨별로 2배씩 증가', () => {
		expect(dupesRequiredForLevel(1)).toBe(1);
		expect(dupesRequiredForLevel(2)).toBe(2);
		expect(dupesRequiredForLevel(3)).toBe(4);
		expect(dupesRequiredForLevel(4)).toBe(8);
	});

	it('enhanceTower returns no_dupes when duplicates below required', () => {
		useMetaStore.getState().loadSave();
		// archer는 기본 duplicateCount 0이므로 1→2 승급 불가
		const result = useMetaStore.getState().enhanceTower('archer');
		expect(result).toBe('no_dupes');
	});

	it('enhanceTower returns no_gold when dupes ok but gold insufficient', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.setState((s) => ({
			profile: { ...s.profile, gold: 0 },
			collection: s.collection.map((t) =>
				t.defId === 'archer' ? { ...t, duplicateCount: 5 } : t,
			),
		}));
		const result = useMetaStore.getState().enhanceTower('archer');
		expect(result).toBe('no_gold');
	});

	it('enhanceTower returns max_level at MAX_TOWER_LEVEL cap', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.setState((s) => ({
			collection: s.collection.map((t) =>
				t.defId === 'archer'
					? { ...t, level: MAX_TOWER_LEVEL, duplicateCount: 1_000_000 }
					: t,
			),
		}));
		const result = useMetaStore.getState().enhanceTower('archer');
		expect(result).toBe('max_level');
	});

	it('setSelectedDeck updates deck', () => {
		useMetaStore.getState().loadSave();
		useMetaStore
			.getState()
			.setSelectedDeck(['emp', 'shield', 'archer', 'nova_cannon']);
		expect(useMetaStore.getState().selectedDeck).toEqual([
			'emp',
			'shield',
			'archer',
			'nova_cannon',
		]);
	});

	it('updateSettings merges partial settings', () => {
		useMetaStore.getState().loadSave();
		useMetaStore.getState().updateSettings({ bgmVolume: 0 });
		expect(useMetaStore.getState().settings.bgmVolume).toBe(0);
		expect(useMetaStore.getState().settings.screenShake).toBe(true);
	});
});
