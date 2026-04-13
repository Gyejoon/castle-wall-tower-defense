import { describe, expect, it } from 'vitest';
import { createSummonPool, drawRandomSummon } from '../src/data/summonPool';

describe('summonPool', () => {
	it('createSummonPool은 5개 타워 ID로 풀 생성', () => {
		const pool = createSummonPool([
			'archer',
			'plasma',
			'emp',
			'shield',
			'twin_archer',
		]);
		expect(pool.towerIds).toHaveLength(5);
		expect(pool.towerIds).toContain('archer');
	});

	it('drawRandomSummon은 풀에서 1개 ID + normal 등급 반환', () => {
		const pool = createSummonPool(['archer']);
		const result = drawRandomSummon(pool, () => 0);
		expect(result.towerId).toBe('archer');
		expect(result.grade).toBe('normal');
	});

	it('drawRandomSummon은 rng로 균등 분포 — 5개 풀에서 idx 4 선택', () => {
		const pool = createSummonPool(['a', 'b', 'c', 'd', 'e']);
		const result = drawRandomSummon(pool, () => 0.99);
		expect(result.towerId).toBe('e');
	});

	it('빈 풀에서 drawRandomSummon은 throw', () => {
		const pool = createSummonPool([]);
		expect(() => drawRandomSummon(pool, () => 0)).toThrow('empty pool');
	});
});
