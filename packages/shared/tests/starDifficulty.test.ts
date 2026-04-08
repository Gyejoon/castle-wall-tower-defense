import { describe, expect, it } from 'vitest';
import {
	checkStarClear,
	getStarDifficultyMult,
	PERFECT_CLEAR_BONUS,
	STAR_CLEAR_CONDITIONS,
	STAR_DIFFICULTY,
	STAR_REWARD_MULTIPLIERS,
} from '../src/constants/starDifficulty';

describe('STAR_DIFFICULTY', () => {
	it('has entries for keys 1, 2, 3', () => {
		expect(STAR_DIFFICULTY[1]).toBeDefined();
		expect(STAR_DIFFICULTY[2]).toBeDefined();
		expect(STAR_DIFFICULTY[3]).toBeDefined();
	});

	it('star 1 has correct values', () => {
		expect(STAR_DIFFICULTY[1]).toEqual({
			hp: 1.0,
			armor: 1.0,
			speed: 1.0,
			ccResist: 0,
			label: '정복',
		});
	});

	it('star 2 has correct values', () => {
		expect(STAR_DIFFICULTY[2]).toEqual({
			hp: 2.5,
			armor: 1.5,
			speed: 1.2,
			ccResist: 0.2,
			label: '정예',
		});
	});

	it('star 3 has correct values', () => {
		expect(STAR_DIFFICULTY[3]).toEqual({
			hp: 5.0,
			armor: 2.5,
			speed: 1.4,
			ccResist: 0.4,
			label: '지옥',
		});
	});
});

describe('getStarDifficultyMult', () => {
	it('returns the star=1 entry', () => {
		expect(getStarDifficultyMult(1)).toBe(STAR_DIFFICULTY[1]);
	});
});

describe('checkStarClear', () => {
	it('star 1 always returns true (survival type)', () => {
		expect(checkStarClear(1, 0, 100)).toBe(true);
		expect(checkStarClear(1, 100, 100)).toBe(true);
		expect(checkStarClear(1, 1, 1000)).toBe(true);
	});

	it('star 2: 10/20 = 50% returns true (meets threshold)', () => {
		expect(checkStarClear(2, 10, 20)).toBe(true);
	});

	it('star 2: 9/20 = 45% returns false (below threshold)', () => {
		expect(checkStarClear(2, 9, 20)).toBe(false);
	});

	it('star 3: 16/20 = 80% returns true (meets threshold)', () => {
		expect(checkStarClear(3, 16, 20)).toBe(true);
	});

	it('star 3: 15/20 = 75% returns false (below threshold)', () => {
		expect(checkStarClear(3, 15, 20)).toBe(false);
	});

	it('star 3: 20/20 = 100% returns true (above threshold)', () => {
		expect(checkStarClear(3, 20, 20)).toBe(true);
	});
});

describe('STAR_REWARD_MULTIPLIERS', () => {
	it('star 1 awakeningStone is 0', () => {
		expect(STAR_REWARD_MULTIPLIERS[1].awakeningStone).toBe(0);
	});

	it('star 3 awakeningStone is 3', () => {
		expect(STAR_REWARD_MULTIPLIERS[3].awakeningStone).toBe(3);
	});
});

describe('PERFECT_CLEAR_BONUS', () => {
	it('awakeningStone is 2', () => {
		expect(PERFECT_CLEAR_BONUS.awakeningStone).toBe(2);
	});
});
