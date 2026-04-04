import { describe, expect, it } from 'vitest';
import { getPlacementGuardFailure } from '../src/placementRules';

describe('getPlacementGuardFailure', () => {
	it('allows placement during combat (PVE real-time)', () => {
		expect(getPlacementGuardFailure({ phase: 'combat' })).toBeNull();
	});

	it('allows placement during boss phase', () => {
		expect(getPlacementGuardFailure({ phase: 'boss' })).toBeNull();
	});

	it('allows placement during waiting phase', () => {
		expect(getPlacementGuardFailure({ phase: 'waiting' })).toBeNull();
	});

	it('blocks placement only after the match has ended', () => {
		expect(getPlacementGuardFailure({ phase: 'ended' })).toBe('combat_phase');
	});
});
