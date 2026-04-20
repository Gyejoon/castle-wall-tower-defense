import { PHASE_A_LONG_MAP } from '@gld/shared';
import { describe, expect, it, vi } from 'vitest';
import { GridManager } from '../src/systems/GridManager';

vi.mock('phaser', () => ({
	default: {
		Geom: {
			Point: class {
				x: number;
				y: number;
				constructor(x: number, y: number) {
					this.x = x;
					this.y = y;
				}
			},
		},
		GameObjects: { Graphics: class {} },
	},
}));

describe('PHASE_A_LONG_MAP obstacle placement', () => {
	it('every obstacle tile is excluded from buildablePoints', () => {
		const buildableSet = new Set(
			PHASE_A_LONG_MAP.buildablePoints.map((p) => `${p.x},${p.y}`),
		);
		for (const obs of PHASE_A_LONG_MAP.obstacles ?? []) {
			expect(buildableSet.has(`${obs.x},${obs.y}`)).toBe(false);
		}
	});

	it('GridManager.canPlaceTower returns false for every obstacle', () => {
		const gm = new GridManager(PHASE_A_LONG_MAP);
		for (const obs of PHASE_A_LONG_MAP.obstacles ?? []) {
			expect(gm.canPlaceTower(obs.x, obs.y)).toBe(false);
		}
	});

	it('placeTower is rejected on every obstacle and tile remains free', () => {
		const gm = new GridManager(PHASE_A_LONG_MAP);
		for (const obs of PHASE_A_LONG_MAP.obstacles ?? []) {
			const placed = gm.placeTower(obs.x, obs.y, 'tower-1');
			expect(placed).toBe(false);
			expect(gm.getTile(obs.x, obs.y)?.occupied).toBe(false);
		}
	});

	it('castleWallTiles include the exit point', () => {
		const wallSet = new Set(
			(PHASE_A_LONG_MAP.castleWallTiles ?? []).map((p) => `${p.x},${p.y}`),
		);
		const exitKey = `${PHASE_A_LONG_MAP.exitPoint.x},${PHASE_A_LONG_MAP.exitPoint.y}`;
		expect(wallSet.has(exitKey)).toBe(true);
	});
});
