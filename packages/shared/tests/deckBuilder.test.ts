import { describe, expect, it } from 'vitest';
import { buildDeckCardsSafe, DEFAULT_DECK } from '../src';
import { buildDeckCards, towerToRole } from '../src/constants/deck';
import { ALL_TOWERS } from '../src/constants/towers';

function findTower(id: string) {
	const tower = ALL_TOWERS.find((t) => t.id === id);
	if (!tower) throw new Error(`missing tower fixture: ${id}`);
	return tower;
}

describe('towerToRole', () => {
	it('maps splash tower to splash role', () => {
		expect(towerToRole(findTower('plasma'))).toBe('splash');
	});
	it('maps slow tower to slow role', () => {
		expect(towerToRole(findTower('emp'))).toBe('slow');
	});
	it('maps stun tower to stun role', () => {
		expect(towerToRole(findTower('shield'))).toBe('stun');
	});
	it('maps damage tower to attacker role', () => {
		expect(towerToRole(findTower('archer'))).toBe('attacker');
	});
	it('categorizes all 18 towers without error', () => {
		for (const tower of ALL_TOWERS) {
			expect(['attacker', 'splash', 'slow', 'stun']).toContain(
				towerToRole(tower),
			);
		}
	});
});

describe('buildDeckCards', () => {
	it('builds 4 DeckCardDef from valid tower IDs', () => {
		const cards = buildDeckCards(['archer', 'plasma', 'emp', 'shield']);
		expect(cards).toHaveLength(4);
		expect(cards[0]).toEqual({
			towerDefId: 'archer',
			energyCost: 10,
			role: 'attacker',
		});
		expect(cards[2]).toEqual({
			towerDefId: 'emp',
			energyCost: 20,
			role: 'slow',
		});
	});
	it('works with higher tier towers', () => {
		const cards = buildDeckCards([
			'dragon_nest',
			'disruptor',
			'holy_shrine',
			'wind_spire',
		]);
		expect(cards[0].energyCost).toBe(10);
		expect(cards[1].role).toBe('slow');
		expect(cards[2].role).toBe('stun');
	});
	it('throws on unknown tower ID', () => {
		expect(() =>
			buildDeckCards(['nonexistent', 'archer', 'plasma', 'emp']),
		).toThrow();
	});
});

describe('buildDeckCardsSafe', () => {
	it('returns valid cards for all-known ids', () => {
		const cards = buildDeckCardsSafe(['archer', 'plasma', 'emp', 'shield']);
		expect(cards).toHaveLength(4);
		expect(cards[0].towerDefId).toBe('archer');
	});

	it('filters out unknown tower ids without throwing', () => {
		const cards = buildDeckCardsSafe(['archer', 'not_a_tower', 'plasma']);
		expect(cards).toHaveLength(2);
		expect(cards.map((c) => c.towerDefId)).toEqual(['archer', 'plasma']);
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
