import { describe, expect, it } from 'vitest';
import { calcTowerPower, calcCombatPower } from '../src/utils/combatPower';
import type { OwnedTower } from '../src/types/save';

// laser baseDmg = 10 (from towers.ts)
// enhancementStatMultiplier(level) = 1 + (level - 1) * 0.03
// GRADE_MULTIPLIER: normal=1.0, rare=1.1
// AWAKENING_MULTIPLIER: [1.0, 1.2, 1.5, 2.0]

function makeTower(overrides: Partial<OwnedTower> = {}): OwnedTower {
	return {
		defId: 'laser',
		level: 1,
		grade: 'normal',
		awakening: 0,
		acquiredAt: 0,
		duplicateCount: 0,
		...overrides,
	};
}

describe('calcTowerPower', () => {
	it('laser level 1, normal, awakening 0 returns 10', () => {
		// Math.round(10 * 1.0 * 1.0 * 1.0) = 10
		expect(calcTowerPower(makeTower())).toBe(10);
	});

	it('laser level 10, rare, awakening 0 returns 14', () => {
		// Math.round(10 * 1.27 * 1.1 * 1.0) = Math.round(13.97) = 14
		expect(calcTowerPower(makeTower({ level: 10, grade: 'rare' }))).toBe(14);
	});

	it('laser level 1, normal, awakening 2 returns 15', () => {
		// Math.round(10 * 1.0 * 1.0 * 1.5) = 15
		expect(calcTowerPower(makeTower({ awakening: 2 }))).toBe(15);
	});

	it('unknown defId returns 0', () => {
		expect(calcTowerPower(makeTower({ defId: 'nonexistent_tower' }))).toBe(0);
	});
});

describe('calcCombatPower', () => {
	it('empty collection returns 0', () => {
		expect(calcCombatPower([])).toBe(0);
	});

	it('sums individual tower powers correctly', () => {
		const collection: OwnedTower[] = [
			makeTower(),                             // 10
			makeTower({ level: 10, grade: 'rare' }), // 14
			makeTower({ awakening: 2 }),             // 15
		];
		expect(calcCombatPower(collection)).toBe(39);
	});
});
