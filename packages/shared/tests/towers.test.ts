import { describe, expect, it } from 'vitest';
import {
	ALL_TOWERS,
	BASE_TOWERS,
	GOD_TOWERS,
	getTowersByTier,
	HEROIC_TOWERS,
	LEGENDARY_TOWERS,
	RARE_TOWERS,
} from '../src/constants/towers';

describe('Tower definitions', () => {
	it('has 18 total towers across 5 tiers', () => {
		expect(ALL_TOWERS.length).toBe(18);
		expect(BASE_TOWERS.length).toBe(4);
		expect(RARE_TOWERS.length).toBe(5);
		expect(HEROIC_TOWERS.length).toBe(4);
		expect(LEGENDARY_TOWERS.length).toBe(3);
		expect(GOD_TOWERS.length).toBe(2);
	});

	it('all towers have unique IDs', () => {
		const ids = ALL_TOWERS.map((t) => t.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('getTowersByTier returns correct towers for each tier', () => {
		expect(getTowersByTier(1).length).toBe(4);
		expect(getTowersByTier(2).length).toBe(5);
		expect(getTowersByTier(3).length).toBe(4);
		expect(getTowersByTier(4).length).toBe(3);
		expect(getTowersByTier(5).length).toBe(2);
		expect(getTowersByTier(6).length).toBe(0);
	});

	it('all T1 towers have cost 50', () => {
		for (const t of BASE_TOWERS) {
			expect(t.cost).toBe(50);
		}
	});

	it('all non-T1 towers have cost 0 (obtained via merge)', () => {
		const nonT1 = [
			...RARE_TOWERS,
			...HEROIC_TOWERS,
			...LEGENDARY_TOWERS,
			...GOD_TOWERS,
		];
		for (const t of nonT1) {
			expect(t.cost).toBe(0);
		}
	});

	it('tier values match their tier group', () => {
		for (const t of BASE_TOWERS) expect(t.tier).toBe(1);
		for (const t of RARE_TOWERS) expect(t.tier).toBe(2);
		for (const t of HEROIC_TOWERS) expect(t.tier).toBe(3);
		for (const t of LEGENDARY_TOWERS) expect(t.tier).toBe(4);
		for (const t of GOD_TOWERS) expect(t.tier).toBe(5);
	});
});
