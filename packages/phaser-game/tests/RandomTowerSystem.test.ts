import { getTowersByTier } from '@gld/shared';
import { describe, expect, it } from 'vitest';
import { RandomTowerSystem } from '../src/systems/RandomTowerSystem';

describe('RandomTowerSystem', () => {
	it('rolls a valid tower from the correct tier pool', () => {
		const system = new RandomTowerSystem();
		const tower = system.rollRandomTower();
		expect(tower).toBeDefined();
		expect(tower.id).toBeTruthy();
		expect(tower.tier).toBeGreaterThanOrEqual(1);
		expect(tower.tier).toBeLessThanOrEqual(5);
		const tieredTowers = getTowersByTier(tower.tier);
		expect(tieredTowers.some((t) => t.id === tower.id)).toBe(true);
	});

	it('tracks consecutive common rolls', () => {
		const system = new RandomTowerSystem();
		expect(system.getConsecutiveCommonRolls()).toBe(0);
	});

	it('resets consecutive counter on non-common roll', () => {
		const system = new RandomTowerSystem();
		// Roll many times — after 100 rolls, at least one should be non-common
		let gotNonCommon = false;
		for (let i = 0; i < 100; i++) {
			const tower = system.rollRandomTower();
			if (tower.tier > 1) {
				gotNonCommon = true;
				expect(system.getConsecutiveCommonRolls()).toBe(0);
				break;
			}
		}
		expect(gotNonCommon).toBe(true);
	});

	it('guarantees non-common after pity threshold', () => {
		const system = new RandomTowerSystem();
		// Force 5 common rolls by rolling until we hit 5 consecutive
		// Due to pity, the 6th roll should be T2+
		let rolls = 0;
		while (system.getConsecutiveCommonRolls() < 5 && rolls < 200) {
			system.rollRandomTower();
			rolls++;
		}
		if (system.getConsecutiveCommonRolls() >= 5) {
			const tower = system.rollRandomTower();
			expect(tower.tier).toBeGreaterThanOrEqual(2);
		}
	});

	it('reset clears state', () => {
		const system = new RandomTowerSystem();
		system.rollRandomTower();
		system.reset();
		expect(system.getConsecutiveCommonRolls()).toBe(0);
	});
});
