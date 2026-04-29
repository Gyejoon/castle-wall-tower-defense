import { getMapPaths, MAIN_LONG_MAP } from '@gld/shared';
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

describe('MAIN_LONG_MAP obstacle placement', () => {
	it('every obstacle tile is excluded from buildablePoints', () => {
		const buildableSet = new Set(
			MAIN_LONG_MAP.buildablePoints.map((p) => `${p.x},${p.y}`),
		);
		for (const obs of MAIN_LONG_MAP.obstacles ?? []) {
			expect(buildableSet.has(`${obs.x},${obs.y}`)).toBe(false);
		}
	});

	it('GridManager.canPlaceTower returns false for every obstacle', () => {
		const gm = new GridManager(MAIN_LONG_MAP);
		for (const obs of MAIN_LONG_MAP.obstacles ?? []) {
			expect(gm.canPlaceTower(obs.x, obs.y)).toBe(false);
		}
	});

	it('placeTower is rejected on every obstacle and tile remains free', () => {
		const gm = new GridManager(MAIN_LONG_MAP);
		for (const obs of MAIN_LONG_MAP.obstacles ?? []) {
			const placed = gm.placeTower(obs.x, obs.y, 'tower-1');
			expect(placed).toBe(false);
			expect(gm.getTile(obs.x, obs.y)?.occupied).toBe(false);
		}
	});

	it('castleWallTiles include the exit point', () => {
		const wallSet = new Set(
			(MAIN_LONG_MAP.castleWallTiles ?? []).map((p) => `${p.x},${p.y}`),
		);
		const exitKey = `${MAIN_LONG_MAP.exitPoint.x},${MAIN_LONG_MAP.exitPoint.y}`;
		expect(wallSet.has(exitKey)).toBe(true);
	});

	it('main_long uses top and bottom lanes that end at the central castle', () => {
		const lanes = getMapPaths(MAIN_LONG_MAP);
		expect(lanes).toHaveLength(4);
		expect(new Set(lanes.map((lane) => `${lane[0].x},${lane[0].y}`))).toEqual(
			new Set(['4,0', '4,17']),
		);
		expect(
			lanes.every((lane) => {
				const end = lane[lane.length - 1];
				return end.x === 4 && end.y === 8;
			}),
		).toBe(true);
	});

	it('main_long exposes exactly six tower placement pads', () => {
		expect(MAIN_LONG_MAP.buildablePoints).toHaveLength(6);
		expect(MAIN_LONG_MAP.placementAnchors).toHaveLength(6);
		const gm = new GridManager(MAIN_LONG_MAP);
		for (const point of MAIN_LONG_MAP.buildablePoints) {
			expect(gm.canPlaceTower(point.x, point.y)).toBe(true);
		}
	});
});
