import { ALL_TOWERS, DEFAULT_DECK } from '@gld/shared';
import { describe, expect, it } from 'vitest';
import { DeckSystem } from '../src/systems/DeckSystem';

describe('DeckSystem', () => {
	it('returns 4 cards for DEFAULT_DECK', () => {
		const ds = new DeckSystem();
		expect(ds.getCards()).toHaveLength(4);
	});

	it('getCard returns card by index', () => {
		const ds = new DeckSystem();
		expect(ds.getCard(0)?.towerDefId).toBe('laser');
		expect(ds.getCard(3)?.towerDefId).toBe('shield');
	});

	it('getCard returns null for out-of-range index', () => {
		const ds = new DeckSystem();
		expect(ds.getCard(99)).toBeNull();
		expect(ds.getCard(-1)).toBeNull();
	});

	it('getCardByTowerId returns correct card', () => {
		const ds = new DeckSystem();
		const card = ds.getCardByTowerId('emp');
		expect(card).not.toBeNull();
		expect(card!.energyCost).toBe(20);
		expect(card!.role).toBe('slow');
	});

	it('shield card has stun role', () => {
		const ds = new DeckSystem();
		const card = ds.getCardByTowerId('shield');
		expect(card).not.toBeNull();
		expect(card!.role).toBe('stun');
	});

	it('getCardByTowerId returns null for unknown id', () => {
		const ds = new DeckSystem();
		expect(ds.getCardByTowerId('nonexistent')).toBeNull();
	});

	it('getTowerDef returns TowerDef from ALL_TOWERS', () => {
		const ds = new DeckSystem();
		const def = ds.getTowerDef('laser');
		expect(def).not.toBeNull();
		expect(def!.name).toBe('궁수 탑');
	});

	it('getTowerDef returns null for unknown id', () => {
		const ds = new DeckSystem();
		expect(ds.getTowerDef('nonexistent')).toBeNull();
	});

	it('every DEFAULT_DECK entry has a valid tower in ALL_TOWERS', () => {
		for (const card of DEFAULT_DECK) {
			const found = ALL_TOWERS.find((t) => t.id === card.towerDefId);
			expect(found, `Tower ${card.towerDefId} not in ALL_TOWERS`).toBeDefined();
		}
	});

	it('reset is callable without error', () => {
		const ds = new DeckSystem();
		expect(() => ds.reset()).not.toThrow();
	});
});
