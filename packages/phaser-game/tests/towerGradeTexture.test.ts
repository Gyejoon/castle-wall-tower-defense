import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
	default: {},
}));

import { resolveTowerTextureKey } from '../src/systems/TowerSystem';

describe('resolveTowerTextureKey', () => {
	it('normal grade → base key', () => {
		expect(resolveTowerTextureKey('archer', 'normal')).toBe('tower-archer');
	});

	it('rare → suffixed key for pilot tower', () => {
		expect(resolveTowerTextureKey('archer', 'rare')).toBe('tower-archer-rare');
	});

	it('unique on pilot', () => {
		expect(resolveTowerTextureKey('flame_tower', 'unique')).toBe(
			'tower-flame_tower-unique',
		);
	});

	it('epic on pilot', () => {
		expect(resolveTowerTextureKey('dragon_nest', 'epic')).toBe(
			'tower-dragon_nest-epic',
		);
	});

	it('all towers now support grade variants', () => {
		expect(resolveTowerTextureKey('plasma', 'rare')).toBe('tower-plasma-rare');
	});

	it('non-pilot tower normal', () => {
		expect(resolveTowerTextureKey('emp', 'normal')).toBe('tower-emp');
	});

	it('all pilot IDs resolve grade variants', () => {
		const pilots = [
			'archer',
			'flame_tower',
			'dragon_nest',
			'wind_spire',
			'arcane_spire',
			'world_tree',
			'celestial',
			'divine_throne',
		];
		for (const id of pilots) {
			expect(resolveTowerTextureKey(id, 'epic')).toBe(`tower-${id}-epic`);
		}
	});
});
