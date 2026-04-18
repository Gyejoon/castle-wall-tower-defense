import { getTowersByFamily } from '@gld/shared';
import { describe, expect, it } from 'vitest';
import { GachaSystem } from '../src/systems/GachaSystem';

/**
 * Deterministic seeded RNG so the statistical tests below are reproducible.
 * Mulberry32 — tiny, good distribution for ~10-20k samples per test.
 */
function mulberry32(seed: number): () => number {
	let t = seed >>> 0;
	return () => {
		t = (t + 0x6d2b79f5) >>> 0;
		let r = t;
		r = Math.imul(r ^ (r >>> 15), r | 1);
		r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

const BASE_FAMILIES = ['archer', 'siege', 'frost', 'stun'] as const;

function isTargetTierTower(id: string, tier: number): boolean {
	return BASE_FAMILIES.some((f) =>
		getTowersByFamily(f).some((t) => t.id === id && t.tier === tier),
	);
}

describe('GachaSystem.rollTier', () => {
	it('T2 success rate ≈ 60% over 10k rolls', () => {
		const rng = mulberry32(0x5eed_1001);
		let successes = 0;
		const N = 10_000;
		for (let i = 0; i < N; i++) {
			const id = GachaSystem.rollTier(2, rng);
			if (isTargetTierTower(id, 2)) successes++;
		}
		const rate = successes / N;
		expect(rate).toBeGreaterThan(0.55);
		expect(rate).toBeLessThan(0.65);
	});

	it('T4 success rate ≈ 5% over 20k rolls', () => {
		const rng = mulberry32(0x5eed_1002);
		let successes = 0;
		const N = 20_000;
		for (let i = 0; i < N; i++) {
			const id = GachaSystem.rollTier(4, rng);
			if (isTargetTierTower(id, 4)) successes++;
		}
		const rate = successes / N;
		expect(rate).toBeGreaterThan(0.035);
		expect(rate).toBeLessThan(0.065);
	});

	it('failure (rng = 0.99) collapses to a T1 tower', () => {
		// rng() returns 0.99 consistently — always fails the success roll and
		// then picks family index floor(0.99 * 4) = 3 → stun family.
		const rng = () => 0.99;
		const id = GachaSystem.rollTier(3, rng);
		// T1 stun base is "shield"; confirm the id belongs to a T1 base tower.
		expect(isTargetTierTower(id, 1)).toBe(true);
	});

	it('oddsBonus = 0.10 raises T2 success rate to ≈ 70%', () => {
		const rng = mulberry32(0x5eed_1003);
		let successes = 0;
		const N = 10_000;
		for (let i = 0; i < N; i++) {
			const id = GachaSystem.rollTier(2, rng, 0.1);
			if (isTargetTierTower(id, 2)) successes++;
		}
		const rate = successes / N;
		expect(rate).toBeGreaterThan(0.65);
		expect(rate).toBeLessThan(0.75);
	});

	it('oddsBonus = 1.0 clamps effective rate to 0.95', () => {
		const rng = mulberry32(0x5eed_1004);
		let successes = 0;
		const N = 10_000;
		for (let i = 0; i < N; i++) {
			const id = GachaSystem.rollTier(2, rng, 1.0);
			if (isTargetTierTower(id, 2)) successes++;
		}
		const rate = successes / N;
		expect(rate).toBeGreaterThan(0.93);
		expect(rate).toBeLessThan(0.97);
	});
});

describe('GachaSystem.getCost', () => {
	it('returns 40 / 80 / 160 for tiers 2 / 3 / 4', () => {
		expect(GachaSystem.getCost(2)).toBe(40);
		expect(GachaSystem.getCost(3)).toBe(80);
		expect(GachaSystem.getCost(4)).toBe(160);
	});
});
