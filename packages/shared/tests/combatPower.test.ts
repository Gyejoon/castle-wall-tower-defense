import { describe, expect, it } from 'vitest';
import type { OwnedTower } from '../src/types/save';
import { calcCombatPower, calcTowerPower } from '../src/utils/combatPower';

// New formula:
//   - Pierce (no special) → damage × levelMult × gradeMult × attackSpeed
//   - Non-pierce → max(0, damage × levelMult × gradeMult − REFERENCE_ARMOR) × attackSpeed
//   - Damage + slow hybrid → DPS path + 0.5 × UTILITY_BASE[key]
//   - Zero damage → UTILITY_BASE[key] (fallback 10)
//   - Final: round((dps + utility) × awakenMult)
//
// Constants: REFERENCE_ARMOR=6, GRADE_BONUS: normal=0, rare=0.8, unique=3.5, epic=13.0
// enhancementStatMultiplier(L) = 1 + (L-1) × 0.04 ; AWAKENING_MULTIPLIER = [1, 1.2, 1.5, 2.0]

function makeTower(overrides: Partial<OwnedTower> = {}): OwnedTower {
	return {
		defId: 'archer',
		level: 1,
		grade: 'normal',
		awakening: 0,
		acquiredAt: 0,
		duplicateCount: 0,
		...overrides,
	};
}

describe('calcTowerPower — pierce towers (no special, ignore armor)', () => {
	it('archer L1 normal = 10 × 1.5 = 15', () => {
		expect(calcTowerPower(makeTower())).toBe(15);
	});

	it('archer L10 rare = round(10 × 1.36 × 1.8 × 1.5) = 37', () => {
		expect(calcTowerPower(makeTower({ level: 10, grade: 'rare' }))).toBe(37);
	});

	it('archer L1 awakening 2 = round(15 × 1.5) = 23', () => {
		expect(calcTowerPower(makeTower({ awakening: 2 }))).toBe(23);
	});

	it('flame_tower (damage 40, AS 1.5, no special = pierce) L1 = 60', () => {
		// Note: plan originally listed `fortress` here, but fortress has
		// special: 'stun_aoe' so it is a damage+stun hybrid, not pierce.
		// Substituted flame_tower (no special) as the correct pierce example.
		// dps = 40 × 1.0 × 1.0 × 1.5 = 60
		expect(calcTowerPower(makeTower({ defId: 'flame_tower' }))).toBe(60);
	});
});

describe('calcTowerPower — non-pierce (splash/slow/stun, armor subtracted)', () => {
	it('plasma L1 (dmg25, AS0.8, splash) = round((25 − 6) × 0.8) = 15', () => {
		expect(calcTowerPower(makeTower({ defId: 'plasma' }))).toBe(15);
	});

	it('plasma L10 unique = round(max(0, 25 × 1.36 × 4.5 − 6) × 0.8) = 118', () => {
		expect(
			calcTowerPower(
				makeTower({ defId: 'plasma', level: 10, grade: 'unique' }),
			),
		).toBe(118);
	});
});

describe('calcTowerPower — damage + slow hybrid', () => {
	it('emp L1 (dmg5, AS1.0, slow_30%) = 0 DPS + 0.5 × 10 utility = 5', () => {
		expect(calcTowerPower(makeTower({ defId: 'emp' }))).toBe(5);
	});

	it('emp L20 rare (dmg5, AS1.0, slow_30%) scales past armor wall', () => {
		// effDmg = 5 × 1.76 × 1.8 = 15.84 ; breakthrough = 9.84 ; dps = 9.84
		// utility = 10 × 0.5 = 5 ; total = 14.84 → 15
		expect(
			calcTowerPower(makeTower({ defId: 'emp', level: 20, grade: 'rare' })),
		).toBe(15);
	});
});

describe('calcTowerPower — pure utility towers (damage 0)', () => {
	it('shield (stun) L1 = 15', () => {
		expect(calcTowerPower(makeTower({ defId: 'shield' }))).toBe(15);
	});

	it('holy_shrine (stun_aoe_extended) L1 = 40', () => {
		expect(calcTowerPower(makeTower({ defId: 'holy_shrine' }))).toBe(40);
	});

	it('unknown defId returns 0', () => {
		expect(calcTowerPower(makeTower({ defId: 'nonexistent_tower' }))).toBe(0);
	});
});

describe('calcCombatPower', () => {
	it('empty collection returns 0', () => {
		expect(calcCombatPower([])).toBe(0);
	});

	it('starter deck sum = archer(15) + plasma(15) + emp(5) + shield(15) = 50', () => {
		const collection: OwnedTower[] = [
			makeTower({ defId: 'archer' }),
			makeTower({ defId: 'plasma' }),
			makeTower({ defId: 'emp' }),
			makeTower({ defId: 'shield' }),
		];
		expect(calcCombatPower(collection)).toBe(50);
	});

	it('deckIds filter', () => {
		const collection: OwnedTower[] = [
			makeTower({ defId: 'archer' }),
			makeTower({ defId: 'plasma' }),
		];
		expect(calcCombatPower(collection, ['archer'])).toBe(15);
	});

	it('with deckIds filters 4-tower collection to deck towers only', () => {
		const collection: OwnedTower[] = [
			makeTower({ defId: 'archer' }), // 15
			makeTower({ defId: 'plasma' }), // 15
			makeTower({ defId: 'emp' }), // 5
			makeTower({ defId: 'shield' }), // 15
		];
		// archer(15) + plasma(15) = 30
		expect(calcCombatPower(collection, ['archer', 'plasma'])).toBe(30);
	});

	it('with missing tower in deckIds, returns partial sum (no throw)', () => {
		const collection: OwnedTower[] = [
			makeTower({ defId: 'archer' }), // 15
		];
		// nonexistent id silently skipped; archer still summed
		expect(calcCombatPower(collection, ['archer', 'nonexistent'])).toBe(15);
	});

	it('empty deckIds array returns 0 (distinct from omitting deckIds)', () => {
		const collection: OwnedTower[] = [makeTower({ defId: 'archer' })];
		expect(calcCombatPower(collection, [])).toBe(0);
	});
});
