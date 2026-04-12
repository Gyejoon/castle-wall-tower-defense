import { describe, expect, it } from 'vitest';
import type { OwnedTower } from '../src/types/save';
import { calcCombatPower, calcTowerPower } from '../src/utils/combatPower';

// New formula: DPS-based (damage * attackSpeed) for damage towers,
// utility-based for support towers (stun=15, stun_aoe=25, etc.)
// enhancementStatMultiplier(level) = 1 + (level - 1) * 0.03
// GRADE_BONUS: normal=0, rare=0.7, unique=2.5, epic=8.0
// AWAKENING_MULTIPLIER: [1.0, 1.2, 1.5, 2.0]

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

describe('calcTowerPower', () => {
	it('archer level 1 = DPS 10*1.5 = 15', () => {
		expect(calcTowerPower(makeTower())).toBe(15);
	});

	it('archer level 10, rare = round(15 * 1.27 * 1.7) = 32', () => {
		expect(calcTowerPower(makeTower({ level: 10, grade: 'rare' }))).toBe(32);
	});

	it('archer level 1, awakening 2 = round(15 * 1.5) = 23', () => {
		expect(calcTowerPower(makeTower({ awakening: 2 }))).toBe(23);
	});

	it('shield (stun utility) level 1 = 15', () => {
		expect(calcTowerPower(makeTower({ defId: 'shield' }))).toBe(15);
	});

	it('fortress (dmg=15, as=1.0) level 1 = DPS 15', () => {
		expect(calcTowerPower(makeTower({ defId: 'fortress' }))).toBe(15);
	});

	it('holy_shrine (stun_aoe_extended utility) level 1 = 40', () => {
		expect(calcTowerPower(makeTower({ defId: 'holy_shrine' }))).toBe(40);
	});

	it('plasma (splash) level 1 = DPS 25*0.8 = 20', () => {
		expect(calcTowerPower(makeTower({ defId: 'plasma' }))).toBe(20);
	});

	it('unknown defId returns 0', () => {
		expect(calcTowerPower(makeTower({ defId: 'nonexistent_tower' }))).toBe(0);
	});
});

describe('calcCombatPower', () => {
	it('empty collection returns 0', () => {
		expect(calcCombatPower([])).toBe(0);
	});

	it('starter deck = 15 + 20 + 5 + 15 = 55', () => {
		const collection: OwnedTower[] = [
			makeTower({ defId: 'archer' }), // 15
			makeTower({ defId: 'plasma' }), // 20
			makeTower({ defId: 'emp' }), // 5
			makeTower({ defId: 'shield' }), // 15
		];
		expect(calcCombatPower(collection)).toBe(55);
	});

	it('with deckIds filters to deck towers only', () => {
		const collection: OwnedTower[] = [
			makeTower({ defId: 'archer' }), // 15
			makeTower({ defId: 'plasma' }), // 20
			makeTower({ defId: 'emp' }), // 5
			makeTower({ defId: 'shield' }), // 15
		];
		expect(calcCombatPower(collection, ['archer', 'plasma'])).toBe(35);
	});

	it('deckIds with missing tower returns partial sum', () => {
		const collection: OwnedTower[] = [
			makeTower({ defId: 'archer' }), // 15
		];
		expect(calcCombatPower(collection, ['archer', 'nonexistent'])).toBe(15);
	});

	it('empty deckIds returns 0', () => {
		const collection: OwnedTower[] = [makeTower({ defId: 'archer' })];
		expect(calcCombatPower(collection, [])).toBe(0);
	});
});
