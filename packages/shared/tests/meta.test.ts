import { describe, expect, it } from 'vitest';
import {
	battleXp,
	createDefaultSave,
	enhancementCost,
	enhancementStatMultiplier,
	getEffectiveStats,
	SAVE_VERSION,
	stunCooldownMultiplier,
	stunDurationMultiplier,
	xpToNextLevel,
} from '../src/index';

describe('xpToNextLevel', () => {
	it('returns 100 at level 1', () => {
		expect(xpToNextLevel(1)).toBe(100);
	});
	it('returns 380 at level 5', () => {
		expect(xpToNextLevel(5)).toBe(380);
	});
	it('returns 955 at level 10', () => {
		expect(xpToNextLevel(10)).toBe(955);
	});
});

describe('battleXp', () => {
	it('returns 150 for 10 waves cleared with victory', () => {
		expect(battleXp(10, true)).toBe(150);
	});
	it('returns 50 for 5 waves cleared without victory', () => {
		expect(battleXp(5, false)).toBe(50);
	});
	it('returns 0 for 0 waves cleared without victory', () => {
		expect(battleXp(0, false)).toBe(0);
	});
});

describe('enhancementCost', () => {
	it('returns 70 for level 1, tier 1', () => {
		expect(enhancementCost(1, 1)).toBe(70);
	});
	it('returns 140 for level 1, tier 3', () => {
		expect(enhancementCost(1, 3)).toBe(140);
	});
	it('returns 1250 for level 10, tier 5', () => {
		expect(enhancementCost(10, 5)).toBe(1250);
	});
});

describe('enhancementStatMultiplier', () => {
	it('returns 1 at level 1', () => {
		expect(enhancementStatMultiplier(1)).toBe(1);
	});
	it('returns ~1.27 at level 10', () => {
		expect(enhancementStatMultiplier(10)).toBeCloseTo(1.27, 2);
	});
	it('returns ~1.87 at level 30', () => {
		expect(enhancementStatMultiplier(30)).toBeCloseTo(1.87, 2);
	});
});

describe('getEffectiveStats', () => {
	it('returns 10 for baseStat=10, level=1, grade=normal', () => {
		expect(getEffectiveStats(10, 1, 'normal')).toBe(10);
	});
	it('returns ~11 for baseStat=10, level=1, grade=rare', () => {
		expect(getEffectiveStats(10, 1, 'rare')).toBeCloseTo(11, 0);
	});
	it('returns ~18.415 for baseStat=10, level=10, grade=epic', () => {
		expect(getEffectiveStats(10, 10, 'epic')).toBeCloseTo(18.415, 2);
	});
});

describe('createDefaultSave', () => {
	it('has correct version', () => {
		expect(createDefaultSave().version).toBe(SAVE_VERSION);
	});
	it('has 4 towers in collection', () => {
		expect(createDefaultSave().collection.length).toBe(4);
	});
	it('starts with 500 gold', () => {
		expect(createDefaultSave().profile.gold).toBe(500);
	});
});

describe('stun level growth', () => {
	describe('stunCooldownMultiplier', () => {
		it('LV.1 returns 1.0 (no growth)', () => {
			expect(stunCooldownMultiplier(1)).toBeCloseTo(1.0, 5);
		});
		it('LV.10 returns 0.91 (-9%)', () => {
			expect(stunCooldownMultiplier(10)).toBeCloseTo(0.91, 5);
		});
		it('LV.20 returns 0.81 (-19%)', () => {
			expect(stunCooldownMultiplier(20)).toBeCloseTo(0.81, 5);
		});
		it('LV.30 returns 0.71 (-29%)', () => {
			expect(stunCooldownMultiplier(30)).toBeCloseTo(0.71, 5);
		});
		it('LV.31~50 plateaus at 0.71', () => {
			expect(stunCooldownMultiplier(31)).toBeCloseTo(0.71, 5);
			expect(stunCooldownMultiplier(50)).toBeCloseTo(0.71, 5);
		});
	});

	describe('stunDurationMultiplier', () => {
		it('LV.1~10 is flat 1.0', () => {
			expect(stunDurationMultiplier(1)).toBeCloseTo(1.0, 5);
			expect(stunDurationMultiplier(10)).toBeCloseTo(1.0, 5);
		});
		it('LV.20 returns 1.2 (+20%)', () => {
			expect(stunDurationMultiplier(20)).toBeCloseTo(1.2, 5);
		});
		it('LV.21~30 plateaus at 1.2', () => {
			expect(stunDurationMultiplier(21)).toBeCloseTo(1.2, 5);
			expect(stunDurationMultiplier(30)).toBeCloseTo(1.2, 5);
		});
		it('LV.50 returns 1.4 (+40%)', () => {
			expect(stunDurationMultiplier(50)).toBeCloseTo(1.4, 5);
		});
	});
});
