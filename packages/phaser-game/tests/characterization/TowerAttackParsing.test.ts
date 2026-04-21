import { describe, expect, it, vi } from 'vitest';

// Phaser + SoundGenerator + EventBus need mocking so TowerSystem imports
// cleanly in a node-only test runner. See tests/SiegeProjectileVfx.test.ts:3-29
// for the canonical pattern.
vi.mock('phaser', () => ({
	default: {
		Animations: { Events: { ANIMATION_COMPLETE: 'animationcomplete' } },
		GameObjects: { Events: { DESTROY: 'destroy' } },
	},
}));
vi.mock('../../src/audio/SoundGenerator', () => ({
	soundGenerator: { playTowerAttack: vi.fn(), playArrowImpact: vi.fn() },
}));
vi.mock('../../src/EventBus', () => ({ EventBus: { emit: vi.fn() } }));

import { TowerSystem } from '../../src/systems/TowerSystem';

// Characterization: pin the current behavior of the 4 private parsing helpers
// at TowerSystem.ts:476-498. Refactor Phase 2+ will move these into per-family
// strategy classes — these tests must stay green throughout the migration.
// Methods are private, so we reach in via `prototype as any` and call with a
// null receiver (they do not touch `this`).
const proto = TowerSystem.prototype as unknown as {
	parseSlowFactor: (special: string) => number;
	hasSplash: (special?: string) => boolean;
	isStunSpecial: (special?: string) => boolean;
	isSlowSpecial: (special?: string) => boolean;
};

describe('TowerSystem special parsing (characterization)', () => {
	it('parseSlowFactor handles slow_30% → 0.7 (returns 1 - 0.30)', () => {
		// Note: parseSlowFactor returns the *remaining speed fraction*, i.e.
		// 1 - pct/100. A slow_30% tower leaves the unit at 0.7x speed.
		expect(proto.parseSlowFactor.call(null, 'slow_30%')).toBeCloseTo(0.7);
	});
	it('parseSlowFactor handles slow_75%_aoe → 0.25 (1 - 0.75)', () => {
		expect(proto.parseSlowFactor.call(null, 'slow_75%_aoe')).toBeCloseTo(0.25);
	});
	it('parseSlowFactor returns 0.7 for unmatched input (current fallback)', () => {
		// Fallback when the regex misses — intentionally lenient, treat as a
		// mild 30% slow. If this is ever tightened to throw/return 1 the
		// refactor must update callers.
		expect(proto.parseSlowFactor.call(null, 'unknown')).toBeCloseTo(0.7);
	});

	it('hasSplash matches splash / splash_1.5 / splash_1.5_slow_30%', () => {
		expect(proto.hasSplash.call(null, 'splash')).toBe(true);
		expect(proto.hasSplash.call(null, 'splash_1.5')).toBe(true);
		expect(proto.hasSplash.call(null, 'splash_1.5_slow_30%')).toBe(true);
		expect(proto.hasSplash.call(null, 'slow_30%')).toBe(false);
		expect(proto.hasSplash.call(null, undefined)).toBe(false);
	});

	it('isStunSpecial matches stun_500ms / stun_500ms_aoe', () => {
		expect(proto.isStunSpecial.call(null, 'stun_500ms')).toBe(true);
		expect(proto.isStunSpecial.call(null, 'stun_500ms_aoe')).toBe(true);
		expect(proto.isStunSpecial.call(null, 'slow_30%')).toBe(false);
		expect(proto.isStunSpecial.call(null, undefined)).toBe(false);
	});

	it('isSlowSpecial matches slow_30% but rejects stun_500ms and splash', () => {
		expect(proto.isSlowSpecial.call(null, 'slow_30%')).toBe(true);
		expect(proto.isSlowSpecial.call(null, 'slow_75%_aoe')).toBe(true);
		expect(proto.isSlowSpecial.call(null, 'stun_500ms')).toBe(false);
		expect(proto.isSlowSpecial.call(null, 'splash_1.5')).toBe(false);
		expect(proto.isSlowSpecial.call(null, undefined)).toBe(false);
	});
});
