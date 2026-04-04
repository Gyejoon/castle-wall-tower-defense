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
		expect(RARE_TOWERS.length).toBe(4);
		expect(HEROIC_TOWERS.length).toBe(4);
		expect(LEGENDARY_TOWERS.length).toBe(4);
		expect(GOD_TOWERS.length).toBe(2);
	});

	it('all towers have unique IDs', () => {
		const ids = ALL_TOWERS.map((t) => t.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('getTowersByTier returns correct towers for each tier', () => {
		expect(getTowersByTier(1).length).toBe(4);
		expect(getTowersByTier(2).length).toBe(4);
		expect(getTowersByTier(3).length).toBe(4);
		expect(getTowersByTier(4).length).toBe(4);
		expect(getTowersByTier(5).length).toBe(2);
		expect(getTowersByTier(6).length).toBe(0);
	});

	it('attack towers cost 10, CC towers cost 20', () => {
		const ccSpecials = ['stun', 'stun_aoe', 'stun_aoe_extended', 'stun_aoe_global', 'slow_30%', 'slow_30%_aoe', 'slow_40%_aoe', 'slow_50%_splash'];
		for (const t of ALL_TOWERS) {
			const isCc = ccSpecials.some((s) => t.stats.special === s);
			if (isCc) {
				expect(t.cost, `${t.id} should cost 20`).toBe(20);
			} else {
				expect(t.cost, `${t.id} should cost 10`).toBe(10);
			}
		}
	});

	it('all towers have a valid element', () => {
		const validElements = ['fire', 'water', 'lightning', 'neutral'];
		for (const t of ALL_TOWERS) {
			expect(validElements, `${t.id} has invalid element`).toContain(t.element);
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
