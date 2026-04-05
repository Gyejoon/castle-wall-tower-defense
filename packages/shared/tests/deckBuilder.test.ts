import { describe, expect, it } from 'vitest';
import { buildDeckCards, towerToRole } from '../src/constants/deck';
import { ALL_TOWERS } from '../src/constants/towers';

describe('towerToRole', () => {
	it('maps splash tower to splash role', () => {
		const plasma = ALL_TOWERS.find((t) => t.id === 'plasma')!;
		expect(towerToRole(plasma)).toBe('splash');
	});
	it('maps slow tower to slow role', () => {
		const emp = ALL_TOWERS.find((t) => t.id === 'emp')!;
		expect(towerToRole(emp)).toBe('slow');
	});
	it('maps stun tower to stun role', () => {
		const shield = ALL_TOWERS.find((t) => t.id === 'shield')!;
		expect(towerToRole(shield)).toBe('stun');
	});
	it('maps damage tower to attacker role', () => {
		const laser = ALL_TOWERS.find((t) => t.id === 'laser')!;
		expect(towerToRole(laser)).toBe('attacker');
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
		const cards = buildDeckCards(['laser', 'plasma', 'emp', 'shield']);
		expect(cards).toHaveLength(4);
		expect(cards[0]).toEqual({
			towerDefId: 'laser',
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
			buildDeckCards(['nonexistent', 'laser', 'plasma', 'emp']),
		).toThrow();
	});
});
