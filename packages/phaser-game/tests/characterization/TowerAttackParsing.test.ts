import { describe, expect, it } from 'vitest';

import {
	hasSplash,
	isSlowSpecial,
	isStunSpecial,
	parseSlowFactor,
} from '../../src/towers/specialParsing';

describe('TowerSystem special parsing (characterization)', () => {
	// parseSlowFactor는 잔여 속도 비율(1 - pct/100)을 반환한다.
	it('parseSlowFactor handles slow_30% → 0.7 (returns 1 - 0.30)', () => {
		expect(parseSlowFactor('slow_30%')).toBeCloseTo(0.7);
	});
	it('parseSlowFactor handles slow_75%_aoe → 0.25 (1 - 0.75)', () => {
		expect(parseSlowFactor('slow_75%_aoe')).toBeCloseTo(0.25);
	});
	// 정규식 매칭 실패 시 30% slow로 너그럽게 fallback.
	it('parseSlowFactor returns 0.7 for unmatched input (current fallback)', () => {
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
