import { describe, expect, it } from 'vitest';
import { buildDeckCardsSafe, DEFAULT_DECK } from '../src';
import { buildDeckCards, towerToRole } from '../src/constants/deck';
import { TOWER_DEFS } from '../src/constants/towers';

describe('towerToRole', () => {
	it('maps splash tower to splash role', () => {
		const siege = TOWER_DEFS.find((t) => t.id === 'nova_cannon');
		expect(siege).toBeDefined();
		if (siege) expect(towerToRole(siege)).toBe('splash');
	});
	it('maps slow tower to slow role', () => {
		const emp = TOWER_DEFS.find((t) => t.id === 'emp');
		expect(emp).toBeDefined();
		if (emp) expect(towerToRole(emp)).toBe('slow');
	});
	it('maps stun tower to stun role', () => {
		const shield = TOWER_DEFS.find((t) => t.id === 'shield');
		expect(shield).toBeDefined();
		if (shield) expect(towerToRole(shield)).toBe('stun');
	});
	it('maps damage-only tower to attacker role', () => {
		const archer = TOWER_DEFS.find((t) => t.id === 'archer');
		expect(archer).toBeDefined();
		if (archer) expect(towerToRole(archer)).toBe('attacker');
	});
	it('categorizes all towers without error', () => {
		for (const tower of TOWER_DEFS) {
			expect(['attacker', 'splash', 'slow', 'stun']).toContain(
				towerToRole(tower),
			);
		}
	});
});

describe('buildDeckCards', () => {
	it('builds 4 DeckCardDef from valid T1 ids', () => {
		const cards = buildDeckCards(['archer', 'nova_cannon', 'emp', 'shield']);
		expect(cards).toHaveLength(4);
		expect(cards[0]).toEqual({
			towerDefId: 'archer',
			energyCost: 20,
			role: 'attacker',
		});
		expect(cards[2]).toEqual({
			towerDefId: 'emp',
			energyCost: 20,
			role: 'slow',
		});
	});
	it('throws on unknown tower ID', () => {
		expect(() =>
			buildDeckCards(['nonexistent', 'archer', 'nova_cannon', 'emp']),
		).toThrow();
	});
});

describe('buildDeckCardsSafe', () => {
	it('returns valid cards for all-known ids', () => {
		const cards = buildDeckCardsSafe([
			'archer',
			'nova_cannon',
			'emp',
			'shield',
		]);
		expect(cards).toHaveLength(4);
		expect(cards[0].towerDefId).toBe('archer');
	});

	it('filters out unknown tower ids without throwing', () => {
		const cards = buildDeckCardsSafe(['archer', 'not_a_tower', 'nova_cannon']);
		expect(cards).toHaveLength(2);
		expect(cards.map((c) => c.towerDefId)).toEqual(['archer', 'nova_cannon']);
	});

	it('falls back to DEFAULT_DECK when input is empty', () => {
		const cards = buildDeckCardsSafe([]);
		expect(cards).toEqual(DEFAULT_DECK);
	});

	it('falls back to DEFAULT_DECK when all ids are unknown', () => {
		const cards = buildDeckCardsSafe(['x', 'y']);
		expect(cards).toEqual(DEFAULT_DECK);
	});
});
