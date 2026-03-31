import { getTowersByTier } from '@gld/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MergeSystem } from '../src/systems/MergeSystem';

const makeMockTowerSystem = () => ({
	getTowerAt: vi.fn(),
	removeTowerAt: vi.fn(),
	placeTower: vi.fn(),
});

describe('MergeSystem', () => {
	let system: MergeSystem;
	let mockTowerSystem: ReturnType<typeof makeMockTowerSystem>;

	const tier1TowerA = { id: 'laser', tier: 1 };
	const tier1TowerB = { id: 'plasma', tier: 1 };
	const tier5Tower = { id: 'god_tower', tier: 5 };

	beforeEach(() => {
		mockTowerSystem = makeMockTowerSystem();
		system = new MergeSystem(
			mockTowerSystem as unknown as ConstructorParameters<
				typeof MergeSystem
			>[0],
		);
	});

	describe('canMerge', () => {
		it('returns true for same-def towers below tier 5', () => {
			mockTowerSystem.getTowerAt
				.mockReturnValueOnce({ def: tier1TowerA })
				.mockReturnValueOnce({ def: tier1TowerA });
			expect(system.canMerge({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(true);
		});

		it('returns false for different tower defs', () => {
			mockTowerSystem.getTowerAt
				.mockReturnValueOnce({ def: tier1TowerA })
				.mockReturnValueOnce({ def: tier1TowerB });
			expect(system.canMerge({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(false);
		});

		it('returns false for same position', () => {
			mockTowerSystem.getTowerAt.mockReturnValue({ def: tier1TowerA });
			expect(system.canMerge({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(false);
		});

		it('returns false for tier 5 towers', () => {
			mockTowerSystem.getTowerAt.mockReturnValue({ def: tier5Tower });
			expect(system.canMerge({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(false);
		});

		it('returns false when tower not found', () => {
			mockTowerSystem.getTowerAt.mockReturnValue(null);
			expect(system.canMerge({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(false);
		});
	});

	describe('merge', () => {
		it('removes both towers and places a next-tier tower', () => {
			mockTowerSystem.getTowerAt.mockReturnValue({ def: tier1TowerA });
			mockTowerSystem.placeTower.mockReturnValue({ success: true });

			const result = system.merge({ x: 0, y: 0 }, { x: 1, y: 0 });

			expect(mockTowerSystem.removeTowerAt).toHaveBeenCalledTimes(2);
			expect(mockTowerSystem.placeTower).toHaveBeenCalledTimes(1);
			expect(result).not.toBeNull();

			const tier2Ids = getTowersByTier(2).map((t) => t.id);
			expect(tier2Ids).toContain(result?.id);
		});

		it('returns null when placement fails', () => {
			mockTowerSystem.getTowerAt.mockReturnValue({ def: tier1TowerA });
			mockTowerSystem.placeTower.mockReturnValue({
				success: false,
				reason: 'blocked_path',
			});

			const result = system.merge({ x: 0, y: 0 }, { x: 1, y: 0 });
			expect(result).toBeNull();
		});

		it('returns null for unmergeable towers', () => {
			mockTowerSystem.getTowerAt
				.mockReturnValueOnce({ def: tier1TowerA })
				.mockReturnValueOnce({ def: tier1TowerB });

			expect(system.merge({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
		});
	});

	it('destroy is callable', () => {
		expect(() => system.destroy()).not.toThrow();
	});
});
