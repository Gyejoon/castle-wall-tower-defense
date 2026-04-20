import { describe, expect, it } from 'vitest';
import {
	getTowerById,
	getTowersByFamily,
	MERGE_CHAIN,
	resolveMerge,
	TOWER_DEFS,
} from '../src/constants/towers';

describe('TOWER_DEFS — Phase A family/tier layout', () => {
	it('has exactly 19 towers', () => {
		expect(TOWER_DEFS).toHaveLength(19);
	});

	it('ids are unique', () => {
		const ids = TOWER_DEFS.map((t) => t.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	const expectedOrder: Record<string, string[]> = {
		archer: ['archer', 'wind_spire', 'flame_tower', 'arcane_spire'],
		siege: ['nova_cannon', 'fortress', 'earth_golem', 'celestial'],
		frost: ['emp', 'stasis_field', 'disruptor', 'world_tree'],
		stun: ['shield', 'twin_archer', 'holy_shrine', 'divine_throne'],
	};

	for (const family of ['archer', 'siege', 'frost', 'stun'] as const) {
		it(`family ${family} has 4 tiers in order`, () => {
			const towers = getTowersByFamily(family);
			expect(towers).toHaveLength(4);
			expect(towers.map((t) => t.id)).toEqual(expectedOrder[family]);
			expect(towers.map((t) => t.tier)).toEqual([1, 2, 3, 4]);
		});
	}

	it('hybrid_ab and hybrid_cd are tier 5, family=hybrid', () => {
		const ab = getTowerById('hybrid_ab');
		const cd = getTowerById('hybrid_cd');
		expect(ab?.family).toBe('hybrid');
		expect(ab?.tier).toBe(5);
		expect(cd?.family).toBe('hybrid');
		expect(cd?.tier).toBe(5);
	});

	it('ultimate is tier 6, family=ultimate', () => {
		const u = getTowerById('ultimate');
		expect(u?.family).toBe('ultimate');
		expect(u?.tier).toBe(6);
	});

	it('removed towers (plasma, dragon_nest) are undefined via getTowerById', () => {
		expect(getTowerById('plasma')).toBeUndefined();
		expect(getTowerById('dragon_nest')).toBeUndefined();
	});
});

describe('MERGE_CHAIN', () => {
	it('same-family T1→T2 lookups', () => {
		expect(MERGE_CHAIN.archer_1_same).toBe('wind_spire');
		expect(MERGE_CHAIN.siege_1_same).toBe('fortress');
		expect(MERGE_CHAIN.frost_1_same).toBe('stasis_field');
		expect(MERGE_CHAIN.stun_1_same).toBe('twin_archer');
	});

	it('same-family T3→T4 lookups', () => {
		expect(MERGE_CHAIN.archer_3_same).toBe('arcane_spire');
		expect(MERGE_CHAIN.siege_3_same).toBe('celestial');
		expect(MERGE_CHAIN.frost_3_same).toBe('world_tree');
		expect(MERGE_CHAIN.stun_3_same).toBe('divine_throne');
	});

	it('T4 cross-family → T5 hybrid (commuted)', () => {
		expect(MERGE_CHAIN['arcane_spire+celestial']).toBe('hybrid_ab');
		expect(MERGE_CHAIN['celestial+arcane_spire']).toBe('hybrid_ab');
		expect(MERGE_CHAIN['world_tree+divine_throne']).toBe('hybrid_cd');
		expect(MERGE_CHAIN['divine_throne+world_tree']).toBe('hybrid_cd');
	});

	it('hybrid_ab + hybrid_cd → ultimate (commuted)', () => {
		expect(MERGE_CHAIN['hybrid_ab+hybrid_cd']).toBe('ultimate');
		expect(MERGE_CHAIN['hybrid_cd+hybrid_ab']).toBe('ultimate');
	});
});

describe('resolveMerge', () => {
	it('same family + same tier (T1) → T2 result', () => {
		expect(resolveMerge('archer', 1, 'archer', 'archer', 1, 'archer')).toBe(
			'wind_spire',
		);
	});

	it('same family + same tier (T3) → T4 result', () => {
		expect(
			resolveMerge('flame_tower', 3, 'archer', 'flame_tower', 3, 'archer'),
		).toBe('arcane_spire');
	});

	it('same family + same tier (T4) → no same-family upgrade, returns null', () => {
		expect(
			resolveMerge('arcane_spire', 4, 'archer', 'arcane_spire', 4, 'archer'),
		).toBeNull();
	});

	it('T4 cross-family → T5 hybrid', () => {
		expect(
			resolveMerge('arcane_spire', 4, 'archer', 'celestial', 4, 'siege'),
		).toBe('hybrid_ab');
		expect(
			resolveMerge('world_tree', 4, 'frost', 'divine_throne', 4, 'stun'),
		).toBe('hybrid_cd');
	});

	it('T5 hybrid + hybrid → ultimate', () => {
		expect(
			resolveMerge('hybrid_ab', 5, 'hybrid', 'hybrid_cd', 5, 'hybrid'),
		).toBe('ultimate');
	});

	it('mismatched merges return null', () => {
		// different tiers, same family
		expect(
			resolveMerge('archer', 1, 'archer', 'wind_spire', 2, 'archer'),
		).toBeNull();
		// different families, not a T4 hybrid pair
		expect(resolveMerge('archer', 1, 'archer', 'emp', 1, 'frost')).toBeNull();
	});
});
