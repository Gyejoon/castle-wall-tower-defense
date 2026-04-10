import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
	default: {
		GameObjects: { Events: { DESTROY: 'destroy' } },
		Animations: { Events: { ANIMATION_COMPLETE: 'animationcomplete' } },
	},
}));

import {
	canPlaceOnTerrain,
	terrainAttackMult,
	terrainRangeBonus,
} from '../src/systems/TowerSystem';

describe('TowerSystem terrain', () => {
	it('blocks placement on water', () => {
		expect(canPlaceOnTerrain('water')).toBe(false);
	});
	it('allows placement on plain', () => {
		expect(canPlaceOnTerrain('plain')).toBe(true);
	});
	it('grants +1 range on hill', () => {
		expect(terrainRangeBonus('hill')).toBe(1);
	});
	it('no range bonus on plain', () => {
		expect(terrainRangeBonus('plain')).toBe(0);
	});
	it('cursed terrain reduces attack by 10%', () => {
		expect(terrainAttackMult('cursed')).toBe(0.9);
	});
	it('plain terrain has no attack modifier', () => {
		expect(terrainAttackMult('plain')).toBe(1);
	});
});
