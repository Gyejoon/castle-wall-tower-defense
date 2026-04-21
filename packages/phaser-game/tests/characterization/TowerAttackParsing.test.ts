import { describe, expect, it } from 'vitest';

// Phase 2.Final: the 4 special-string parsing helpers moved from
// TowerSystem private methods into `src/towers/specialParsing.ts` as
// pure functions. The characterization suite pins their exact behavior
// so the new-strategy emitters (archer/frost/stun/siege/composite) that
// depend on them through `ctx`/registry paths keep matching the legacy
// TowerSystem semantics documented at the original call sites.
import {
	hasSplash,
	isSlowSpecial,
	isStunSpecial,
	parseSlowFactor,
} from '../../src/towers/specialParsing';

describe('TowerSystem special parsing (characterization)', () => {
	it('parseSlowFactor handles slow_30% → 0.7 (returns 1 - 0.30)', () => {
		// Note: parseSlowFactor returns the *remaining speed fraction*, i.e.
		// 1 - pct/100. A slow_30% tower leaves the unit at 0.7x speed.
		expect(parseSlowFactor('slow_30%')).toBeCloseTo(0.7);
	});
	it('parseSlowFactor handles slow_75%_aoe → 0.25 (1 - 0.75)', () => {
		expect(parseSlowFactor('slow_75%_aoe')).toBeCloseTo(0.25);
	});
	it('parseSlowFactor returns 0.7 for unmatched input (current fallback)', () => {
		// Fallback when the regex misses — intentionally lenient, treat as a
		// mild 30% slow. If this is ever tightened to throw/return 1 the
		// refactor must update callers.
		expect(parseSlowFactor('unknown')).toBeCloseTo(0.7);
	});

	it('hasSplash matches splash / splash_1.5 / splash_1.5_slow_30%', () => {
		expect(hasSplash('splash')).toBe(true);
		expect(hasSplash('splash_1.5')).toBe(true);
		expect(hasSplash('splash_1.5_slow_30%')).toBe(true);
		expect(hasSplash('slow_30%')).toBe(false);
		expect(hasSplash(undefined)).toBe(false);
	});

	it('isStunSpecial matches stun_500ms / stun_500ms_aoe', () => {
		expect(isStunSpecial('stun_500ms')).toBe(true);
		expect(isStunSpecial('stun_500ms_aoe')).toBe(true);
		expect(isStunSpecial('slow_30%')).toBe(false);
		expect(isStunSpecial(undefined)).toBe(false);
	});

	it('isSlowSpecial matches slow_30% but rejects stun_500ms and splash', () => {
		expect(isSlowSpecial('slow_30%')).toBe(true);
		expect(isSlowSpecial('slow_75%_aoe')).toBe(true);
		expect(isSlowSpecial('stun_500ms')).toBe(false);
		expect(isSlowSpecial('splash_1.5')).toBe(false);
		expect(isSlowSpecial(undefined)).toBe(false);
	});
});
