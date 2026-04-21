import { describe, expect, it } from 'vitest';
import { getTowerById } from '../src/constants/towers';
import {
	createSummonPool,
	drawRandomSummon,
	SUMMON_COST,
} from '../src/data/summonPool';

describe('정식 모드 summon pool — tier 1 only', () => {
	it('default pool has exactly the 4 base-family T1 ids', () => {
		const pool = createSummonPool();
		expect(new Set(pool.towerIds)).toEqual(
			new Set(['archer', 'nova_cannon', 'emp', 'shield']),
		);
	});

	it('every pool entry is tier 1', () => {
		const pool = createSummonPool();
		for (const id of pool.towerIds) {
			const def = getTowerById(id);
			expect(def, `tower ${id} must exist`).toBeDefined();
			expect(def?.tier).toBe(1);
		}
	});

	it('pool covers all 4 base families (archer, siege, frost, stun)', () => {
		const pool = createSummonPool();
		const families = new Set(
			pool.towerIds.map((id) => getTowerById(id)?.family),
		);
		expect(families).toEqual(new Set(['archer', 'siege', 'frost', 'stun']));
	});

	it('drawRandomSummon returns only a towerId (no grade)', () => {
		const pool = createSummonPool(['archer']);
		const r = drawRandomSummon(pool, () => 0);
		expect(r).toEqual({ towerId: 'archer' });
	});

	it('SUMMON_COST === 20 (matches T1 cost)', () => {
		expect(SUMMON_COST).toBe(20);
	});

	it('empty pool throws', () => {
		const pool = createSummonPool([]);
		expect(() => drawRandomSummon(pool, () => 0)).toThrow('empty pool');
	});
});
