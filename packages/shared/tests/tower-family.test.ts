import { describe, expect, it } from 'vitest';
import type { TowerDef, TowerFamily } from '../src/types/tower';

describe('TowerDef — family/tier type', () => {
	it('accepts a minimal TowerDef with family="archer" and tier=1', () => {
		const def: TowerDef = {
			id: 'archer',
			name: '궁수탑',
			family: 'archer',
			tier: 1,
			stats: { damage: 20, range: 4, attackSpeed: 1.0 },
			cost: 20,
			element: 'neutral',
			isPremium: false,
			color: '#c8a04a',
			shape: 'diamond',
		};
		expect(def.family).toBe('archer');
		expect(def.tier).toBe(1);
	});

	it('TowerFamily union accepts every documented family tag', () => {
		const families: TowerFamily[] = [
			'archer',
			'siege',
			'frost',
			'stun',
			'hybrid',
			'ultimate',
		];
		for (const f of families) {
			const def: TowerDef = {
				id: 'archer',
				name: 'x',
				family: f,
				tier: 1,
				stats: { damage: 1, range: 1, attackSpeed: 1 },
				cost: 1,
				element: 'neutral',
				isPremium: false,
				color: '#000',
				shape: 'diamond',
			};
			expect(def.family).toBe(f);
		}
	});
});
