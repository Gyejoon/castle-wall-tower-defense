import { describe, expect, it } from 'vitest';
import {
	battleXp,
	createDefaultSave,
	enhancementCost,
	enhancementStatMultiplier,
	getEffectiveStats,
	maxLevelForGrade,
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

describe('enhancementCost — quadratic curve (100 + 40L + 3L²) × tier × grade', () => {
	it('L1 tier1 normal = floor((100 + 40 + 3) × 1 × 1) = 143', () => {
		expect(enhancementCost(1, 1, 'normal')).toBe(143);
	});
	it('L1 tier3 normal = floor(143 × 2) = 286', () => {
		expect(enhancementCost(1, 3, 'normal')).toBe(286);
	});
	it('L10 tier5 normal = floor((100 + 400 + 300) × 5 × 1) = 4000', () => {
		expect(enhancementCost(10, 5, 'normal')).toBe(4000);
	});
	it('L30 tier1 normal = floor(100 + 1200 + 2700) = 4000', () => {
		expect(enhancementCost(30, 1, 'normal')).toBe(4000);
	});
	it('L50 tier1 normal = floor(100 + 2000 + 7500) = 9600', () => {
		expect(enhancementCost(50, 1, 'normal')).toBe(9600);
	});
	it('scales 2x for rare', () => {
		expect(enhancementCost(1, 1, 'rare')).toBe(286);
	});
	it('scales 4x for unique', () => {
		expect(enhancementCost(1, 1, 'unique')).toBe(572); // 143 × 4
	});
	it('scales 8x for epic', () => {
		expect(enhancementCost(1, 1, 'epic')).toBe(1144);
	});
});

describe('enhancementStatMultiplier', () => {
	it('returns 1 at level 1', () => {
		expect(enhancementStatMultiplier(1)).toBe(1);
	});
	it('returns ~1.36 at level 10', () => {
		expect(enhancementStatMultiplier(10)).toBeCloseTo(1.36, 2);
	});
	it('returns ~2.16 at level 30', () => {
		expect(enhancementStatMultiplier(30)).toBeCloseTo(2.16, 2);
	});
});

describe('getEffectiveStats', () => {
	it('returns 10 for baseStat=10, level=1, grade=normal', () => {
		expect(getEffectiveStats(10, 1, 'normal')).toBe(10);
	});
	it('returns 18 for baseStat=10, level=1, grade=rare (+80%)', () => {
		expect(getEffectiveStats(10, 1, 'rare')).toBeCloseTo(18, 2);
	});
	it('returns ~190.4 for baseStat=10, level=10, grade=epic', () => {
		expect(getEffectiveStats(10, 10, 'epic')).toBeCloseTo(190.4, 1);
	});
	it('higher grade Lv.1 > previous grade max level (promotion power gate)', () => {
		// normal max Lv.20: 10 × 1.76 = 17.6
		// rare Lv.1: 10 × 1.0 × 1.8 = 18.0 > 17.6 ✓
		expect(getEffectiveStats(10, 1, 'rare')).toBeGreaterThan(
			getEffectiveStats(10, 20, 'normal'),
		);
		// rare max Lv.30: 10 × 2.16 × 1.8 = 38.88
		// unique Lv.1: 10 × 1.0 × 4.5 = 45.0 > 38.88 ✓
		expect(getEffectiveStats(10, 1, 'unique')).toBeGreaterThan(
			getEffectiveStats(10, 30, 'rare'),
		);
		// unique max Lv.50: 10 × 2.96 × 4.5 = 133.2
		// epic Lv.1: 10 × 1.0 × 14.0 = 140.0 > 133.2 ✓
		expect(getEffectiveStats(10, 1, 'epic')).toBeGreaterThan(
			getEffectiveStats(10, 50, 'unique'),
		);
	});
});

describe('maxLevelForGrade', () => {
	it('normal caps at 20', () => {
		expect(maxLevelForGrade('normal')).toBe(20);
	});
	it('rare caps at 30', () => {
		expect(maxLevelForGrade('rare')).toBe(30);
	});
	it('unique caps at 50', () => {
		expect(maxLevelForGrade('unique')).toBe(50);
	});
	it('epic caps at 50', () => {
		expect(maxLevelForGrade('epic')).toBe(50);
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
