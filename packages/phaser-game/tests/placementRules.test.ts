import { describe, expect, it } from 'vitest';
import { getPlacementGuardFailure } from '../src/placementRules';

describe('getPlacementGuardFailure', () => {
  it('blocks placement during combat', () => {
    expect(
      getPlacementGuardFailure({
        phase: 'combat',
        gold: 200,
        towerCost: 50,
      }),
    ).toBe('combat_phase');
  });

  it('blocks placement when gold is insufficient', () => {
    expect(
      getPlacementGuardFailure({
        phase: 'building',
        gold: 40,
        towerCost: 50,
      }),
    ).toBe('insufficient_gold');
  });

  it('allows placement during building when gold is sufficient', () => {
    expect(
      getPlacementGuardFailure({
        phase: 'building',
        gold: 80,
        towerCost: 50,
      }),
    ).toBeNull();
  });
});
