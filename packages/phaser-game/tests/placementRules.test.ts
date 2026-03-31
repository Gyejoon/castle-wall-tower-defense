import { describe, expect, it } from 'vitest';
import { getPlacementGuardFailure } from '../src/placementRules';

describe('getPlacementGuardFailure', () => {
	it('allows placement during running combat because the loop is real-time', () => {
		expect(
			getPlacementGuardFailure({
				phase: 'running',
				gold: 200,
				towerCost: 50,
			}),
		).toBeNull();
	});

	it('blocks placement when gold is insufficient', () => {
		expect(
			getPlacementGuardFailure({
				phase: 'running',
				gold: 40,
				towerCost: 50,
			}),
		).toBe('insufficient_gold');
	});

	it('blocks placement only after the match has ended', () => {
		expect(
			getPlacementGuardFailure({
				phase: 'ended',
				gold: 200,
				towerCost: 50,
			}),
		).toBe('combat_phase');
	});
});
