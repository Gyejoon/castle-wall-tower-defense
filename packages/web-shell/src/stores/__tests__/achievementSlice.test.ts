// @vitest-environment jsdom

import { createDefaultSave } from '@gld/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { useMetaStore } from '../metaStore';

describe('achievementSlice', () => {
	beforeEach(() => {
		useMetaStore.setState(createDefaultSave());
	});

	describe('updateAchievementProgress', () => {
		it('sets progress for a new achievement id', () => {
			useMetaStore.getState().updateAchievementProgress('cp_100', 50);
			expect(useMetaStore.getState().progress.achievements.progress['cp_100']).toBe(50);
		});

		it('does not decrease existing progress (Math.max)', () => {
			useMetaStore.getState().updateAchievementProgress('cp_100', 80);
			useMetaStore.getState().updateAchievementProgress('cp_100', 30);
			expect(useMetaStore.getState().progress.achievements.progress['cp_100']).toBe(80);
		});

		it('replaces lower value with higher value', () => {
			useMetaStore.getState().updateAchievementProgress('cp_100', 50);
			useMetaStore.getState().updateAchievementProgress('cp_100', 100);
			expect(useMetaStore.getState().progress.achievements.progress['cp_100']).toBe(100);
		});
	});

	describe('claimAchievement', () => {
		it('returns not_ready when progress < target', () => {
			useMetaStore.getState().updateAchievementProgress('cp_100', 50);
			const result = useMetaStore.getState().claimAchievement('cp_100');
			expect(result).toBe('not_ready');
		});

		it('returns success and adds diamond when progress >= target', () => {
			const beforeDiamond = useMetaStore.getState().profile.diamond;
			useMetaStore.getState().updateAchievementProgress('cp_100', 100);
			const result = useMetaStore.getState().claimAchievement('cp_100');
			expect(result).toBe('success');
			expect(useMetaStore.getState().profile.diamond).toBe(beforeDiamond + 50);
		});

		it('returns already_claimed on second claim', () => {
			useMetaStore.getState().updateAchievementProgress('cp_100', 100);
			useMetaStore.getState().claimAchievement('cp_100');
			const result = useMetaStore.getState().claimAchievement('cp_100');
			expect(result).toBe('already_claimed');
		});

		it('diamond amount matches ACHIEVEMENT_MAP definition (cp_100 = 50)', () => {
			const beforeDiamond = useMetaStore.getState().profile.diamond;
			useMetaStore.getState().updateAchievementProgress('cp_100', 100);
			useMetaStore.getState().claimAchievement('cp_100');
			expect(useMetaStore.getState().profile.diamond).toBe(beforeDiamond + 50);
		});
	});

	describe('checkAchievements', () => {
		it('returns empty array when no achievements are met', () => {
			const result = useMetaStore.getState().checkAchievements();
			expect(result).toEqual([]);
		});

		it('returns achievement IDs that are met but not yet claimed', () => {
			useMetaStore.getState().updateAchievementProgress('cp_100', 100);
			const result = useMetaStore.getState().checkAchievements();
			expect(result).toContain('cp_100');
		});

		it('does not return already-claimed achievements', () => {
			useMetaStore.getState().updateAchievementProgress('cp_100', 100);
			useMetaStore.getState().claimAchievement('cp_100');
			const result = useMetaStore.getState().checkAchievements();
			expect(result).not.toContain('cp_100');
		});
	});
});
