import { describe, expect, it } from 'vitest';
import {
	CC_AURA_CONFIGS,
	ELEMENT_MATCHUP,
	getElementMultiplier,
} from '../src/constants/elements';

describe('Element matchup', () => {
	it('fire beats lightning at 1.3x', () => {
		expect(getElementMultiplier('fire', 'lightning')).toBe(1.3);
	});

	it('fire is weak to water at 0.7x', () => {
		expect(getElementMultiplier('fire', 'water')).toBe(0.7);
	});

	it('neutral is always 1.0x', () => {
		expect(getElementMultiplier('neutral', 'fire')).toBe(1.0);
		expect(getElementMultiplier('neutral', 'water')).toBe(1.0);
		expect(getElementMultiplier('neutral', 'lightning')).toBe(1.0);
		expect(getElementMultiplier('neutral', 'neutral')).toBe(1.0);
	});

	it('same element is 1.0x', () => {
		expect(getElementMultiplier('fire', 'fire')).toBe(1.0);
		expect(getElementMultiplier('water', 'water')).toBe(1.0);
		expect(getElementMultiplier('lightning', 'lightning')).toBe(1.0);
	});

	it('matchup table has all 16 entries', () => {
		const elements = ['fire', 'water', 'lightning', 'neutral'] as const;
		for (const atk of elements) {
			for (const def of elements) {
				expect(ELEMENT_MATCHUP[atk][def]).toBeDefined();
			}
		}
	});
});

describe('CC aura configs', () => {
	it('stun has 3s cooldown, 1s duration, single target', () => {
		expect(CC_AURA_CONFIGS.stun).toEqual({
			cooldownMs: 3000,
			durationMs: 1000,
			aoe: false,
		});
	});

	it('stun_aoe_global has longest cooldown and duration', () => {
		const global = CC_AURA_CONFIGS.stun_aoe_global;
		expect(global).toEqual({
			cooldownMs: 7000,
			durationMs: 2000,
			aoe: true,
		});
	});
});
