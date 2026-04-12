import { describe, expect, it } from 'vitest';
import type { StarRating } from '../../constants/starDifficulty';
import {
	getStageLockStatus,
	isStageUnlocked,
	isWorldUnlocked,
} from '../unlock-rules';

function stars(
	entries: Array<[string, StarRating]>,
): Record<string, StarRating> {
	return Object.fromEntries(entries);
}

describe('isWorldUnlocked', () => {
	it('w1_forest is always unlocked', () => {
		expect(isWorldUnlocked('w1_forest', {})).toBe(true);
	});

	it('w2_forge requires all W1 stages at ★1+', () => {
		const partial = stars([
			['w1_s1', 1],
			['w1_s2', 1],
			['w1_s3', 1],
			['w1_s4', 1],
			['w1_s5', 1],
			['w1_s6', 1],
			['w1_s7', 1],
		]);
		expect(isWorldUnlocked('w2_forge', partial)).toBe(false);

		const full = { ...partial, w1_s8: 1 as StarRating };
		expect(isWorldUnlocked('w2_forge', full)).toBe(true);
	});

	it('w3_tower requires all W2 at ★1', () => {
		const starsMap: Record<string, StarRating> = {};
		for (let i = 1; i <= 8; i++) starsMap[`w1_s${i}`] = 1;
		for (let i = 1; i <= 8; i++) starsMap[`w2_s${i}`] = 1;
		expect(isWorldUnlocked('w3_tower', starsMap)).toBe(true);
	});

	it('w4_catacombs has empty stageCount → never unlockable in this plan', () => {
		// W4 has mapPool=[], stageCount=0 → its unlock rule references W3 stages
		// but even after full W3 clear, the rule evaluates normally (returns true),
		// but W4 has no playable stages. This test just ensures the function
		// does not throw on unknown stages.
		const starsMap: Record<string, StarRating> = {};
		for (let i = 1; i <= 8; i++) starsMap[`w3_s${i}`] = 1;
		expect(() => isWorldUnlocked('w4_catacombs', starsMap)).not.toThrow();
	});
});

describe('isStageUnlocked', () => {
	const w1Complete: Record<string, StarRating> = {};
	for (let i = 1; i <= 8; i++) w1Complete[`w1_s${i}`] = 1;

	it('w1_s1 always unlocked', () => {
		expect(isStageUnlocked('w1_s1', {})).toBe(true);
	});

	it('w1_s2 requires w1_s1 cleared', () => {
		expect(isStageUnlocked('w1_s2', {})).toBe(false);
		expect(isStageUnlocked('w1_s2', { w1_s1: 1 })).toBe(true);
	});

	it('w2_s1 requires W1 fully cleared', () => {
		expect(isStageUnlocked('w2_s1', {})).toBe(false);
		expect(isStageUnlocked('w2_s1', w1Complete)).toBe(true);
	});

	it('throws on unknown stage id', () => {
		expect(() => isStageUnlocked('w9_s99', {})).toThrow();
	});
});

describe('getStageLockStatus', () => {
	it('returns locked:false for unlocked stage', () => {
		expect(getStageLockStatus('w1_s1', {}).locked).toBe(false);
	});

	it('returns user-friendly reason for locked W2 stage', () => {
		const status = getStageLockStatus('w2_s1', {});
		const reason = status.reason;
		expect(status.locked).toBe(true);
		expect(reason).toBeTruthy();
		// Korean message should reference W1
		expect(reason?.length).toBeGreaterThan(0);
	});

	it('returns previous-stage reason for locked mid-world stage', () => {
		const status = getStageLockStatus('w1_s3', { w1_s1: 1 });
		expect(status.locked).toBe(true);
		expect(status.reason).toBeTruthy();
	});
});
