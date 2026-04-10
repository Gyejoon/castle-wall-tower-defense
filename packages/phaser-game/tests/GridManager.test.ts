import type { GridConfig, MapLayout } from '@gld/shared';
import {
	BOARD_TOP_PADDING,
	FOREST_GATE_MAP,
	ORTHO_TILE,
	type TerrainKind,
} from '@gld/shared';
import { beforeAll, describe, expect, it, vi } from 'vitest';

// Mock Phaser entirely — GridManager only uses Phaser.Geom.Point and Phaser.GameObjects.Graphics
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

// Dynamic import after mock is registered
let GridManager: typeof import('../src/systems/GridManager').GridManager;
beforeAll(async () => {
	const mod = await import('../src/systems/GridManager');
	GridManager = mod.GridManager;
});

const TEST_CONFIG: GridConfig = {
	width: 10,
	height: 10,
	spawnPoint: { x: 0, y: 5 },
	exitPoint: { x: 5, y: 5 },
};

function makeTerrainMap(
	terrain: TerrainKind[][],
	overrides: Partial<MapLayout> = {},
): MapLayout {
	const height = terrain.length;
	const width = terrain[0]?.length ?? 0;
	return {
		id: 'terrain_test',
		name: 'Terrain Test',
		width,
		height,
		tileSize: ORTHO_TILE,
		path: [],
		paths: [],
		terrain,
		structures: [],
		blockedPlacementPoints: [],
		buildablePoints: [],
		spawnPoint: { x: 0, y: 0 },
		exitPoint: { x: width - 1, y: height - 1 },
		tilemapKey: 'tilemap-test',
		tilesetKey: 'tileset-test',
		recommendedPower: 1,
		rewardMultiplier: 1,
		difficultyHpMult: 1,
		...overrides,
	};
}

// Orthogonal offsets: offsetX = 0, offsetY = BOARD_TOP_PADDING
const OFFSET_X = 0;
const OFFSET_Y = BOARD_TOP_PADDING;

describe('GridManager', () => {
	it('생성자가 속성을 올바르게 설정해야 한다', () => {
		const gm = new GridManager(TEST_CONFIG);
		expect(gm.width).toBe(10);
		expect(gm.height).toBe(10);
		expect(gm.tileSize).toBe(53);
		expect(gm.spawnPoint).toEqual({ x: 0, y: 5 });
		expect(gm.exitPoint).toEqual({ x: 5, y: 5 });
	});

	it('isInBounds가 경계 검사를 올바르게 수행해야 한다', () => {
		const gm = new GridManager(TEST_CONFIG);
		expect(gm.isInBounds(0, 0)).toBe(true);
		expect(gm.isInBounds(9, 9)).toBe(true);
		expect(gm.isInBounds(-1, 0)).toBe(false);
		expect(gm.isInBounds(10, 0)).toBe(false);
		expect(gm.isInBounds(0, 10)).toBe(false);
	});

	it('isWalkable이 빈 타일에 true를 반환해야 한다', () => {
		const gm = new GridManager(TEST_CONFIG);
		expect(gm.isWalkable(1, 1)).toBe(true);
	});

	it('isWalkable이 범위 밖에 false를 반환해야 한다', () => {
		const gm = new GridManager(TEST_CONFIG);
		expect(gm.isWalkable(-1, 0)).toBe(false);
		expect(gm.isWalkable(10, 0)).toBe(false);
	});

	it('placeTower가 빈 타일에 배치하고 true를 반환해야 한다', () => {
		const gm = new GridManager(TEST_CONFIG);
		expect(gm.placeTower(1, 1, 'tower-1')).toBe(true);
	});

	it('placeTower 후 isWalkable이 false를 반환해야 한다', () => {
		const gm = new GridManager(TEST_CONFIG);
		gm.placeTower(1, 1, 'tower-1');
		expect(gm.isWalkable(1, 1)).toBe(false);
	});

	it('이미 점유된 타일에 placeTower가 false를 반환해야 한다', () => {
		const gm = new GridManager(TEST_CONFIG);
		gm.placeTower(1, 1, 'tower-1');
		expect(gm.placeTower(1, 1, 'tower-2')).toBe(false);
	});

	it('placeTower가 스폰/출구 포인트에 false를 반환해야 한다', () => {
		const gm = new GridManager(TEST_CONFIG);
		expect(gm.placeTower(0, 5, 'tower-1')).toBe(false);
		expect(gm.placeTower(5, 5, 'tower-1')).toBe(false);
	});

	it('FOREST_GATE_MAP path 타일에는 타워를 배치할 수 없어야 한다', () => {
		const gm = new GridManager(FOREST_GATE_MAP);
		const pathPoint = FOREST_GATE_MAP.path[1];
		expect(gm.placeTower(pathPoint.x, pathPoint.y, 'tower-1')).toBe(false);
	});

	it('FOREST_GATE_MAP blocked-placement 타일에는 타워를 배치할 수 없어야 한다', () => {
		const gm = new GridManager(FOREST_GATE_MAP);
		const blockedPoint = { x: 0, y: 0 };
		expect(gm.placeTower(blockedPoint.x, blockedPoint.y, 'tower-1')).toBe(
			false,
		);
	});

	it('FOREST_GATE_MAP buildable 타일에는 타워를 배치할 수 있어야 한다', () => {
		const gm = new GridManager(FOREST_GATE_MAP);
		const buildablePoint = FOREST_GATE_MAP.buildablePoints[0];
		expect(gm.placeTower(buildablePoint.x, buildablePoint.y, 'tower-1')).toBe(
			true,
		);
	});

	it('removeTower가 타워를 제거하고 true를 반환해야 한다', () => {
		const gm = new GridManager(TEST_CONFIG);
		gm.placeTower(1, 1, 'tower-1');
		expect(gm.removeTower(1, 1)).toBe(true);
		expect(gm.isWalkable(1, 1)).toBe(true);
	});

	it('removeTower가 빈 타일에 false를 반환해야 한다', () => {
		const gm = new GridManager(TEST_CONFIG);
		expect(gm.removeTower(1, 1)).toBe(false);
	});

	it('getTile이 올바른 타일 정보를 반환해야 한다', () => {
		const gm = new GridManager(TEST_CONFIG);
		const tile = gm.getTile(1, 1);
		expect(tile).not.toBeNull();
		expect(tile?.walkable).toBe(true);
		expect(tile?.occupied).toBe(false);
		expect(tile?.towerId).toBeNull();
	});

	it('getTile이 범위 밖에 null을 반환해야 한다', () => {
		const gm = new GridManager(TEST_CONFIG);
		expect(gm.getTile(-1, 0)).toBeNull();
		expect(gm.getTile(10, 0)).toBeNull();
	});

	it('gridToWorld가 직교 좌표로 변환해야 한다', () => {
		const gm = new GridManager(TEST_CONFIG);
		const half = ORTHO_TILE / 2;

		const p00 = gm.gridToWorld(0, 0);
		expect(p00.x).toBe(OFFSET_X + half);
		expect(p00.y).toBe(OFFSET_Y + half);

		const p10 = gm.gridToWorld(1, 0);
		expect(p10.x).toBe(OFFSET_X + ORTHO_TILE + half);
		expect(p10.y).toBe(OFFSET_Y + half);

		const p01 = gm.gridToWorld(0, 1);
		expect(p01.x).toBe(OFFSET_X + half);
		expect(p01.y).toBe(OFFSET_Y + ORTHO_TILE + half);
	});

	it('worldToGrid가 직교 역변환을 수행해야 한다', () => {
		const gm = new GridManager(TEST_CONFIG);
		const world = gm.gridToWorld(3, 2);
		const grid = gm.worldToGrid(world.x, world.y);
		expect(grid.x).toBe(3);
		expect(grid.y).toBe(2);
	});

	it('worldToGridFloat가 연속 좌표를 반환해야 한다', () => {
		const gm = new GridManager(TEST_CONFIG);
		const world = gm.gridToWorld(3, 2);
		const floatGrid = gm.worldToGridFloat(world.x, world.y);
		// gridToWorld returns tile center, so worldToGridFloat returns gx + 0.5
		expect(floatGrid.x).toBeCloseTo(3.5, 5);
		expect(floatGrid.y).toBeCloseTo(2.5, 5);
	});

	it('worldToGridFloat가 타일 사이 위치에서 소수점을 반환해야 한다', () => {
		const gm = new GridManager(TEST_CONFIG);
		const world = gm.gridToWorld(3, 2);
		const shifted = gm.worldToGridFloat(world.x + 10, world.y + 5);
		expect(shifted.x % 1).not.toBe(0);
	});

	it('getDepth가 gridY + 10을 반환해야 한다', () => {
		const gm = new GridManager(TEST_CONFIG);
		expect(gm.getDepth(0, 0)).toBe(10);
		expect(gm.getDepth(3, 4)).toBe(14);
		expect(gm.getDepth(9, 9)).toBe(19);
	});

	it('getWalkabilityGrid가 올바른 2D 배열을 반환해야 한다', () => {
		const gm = new GridManager(TEST_CONFIG);
		gm.placeTower(2, 3, 'tower-1');
		const grid = gm.getWalkabilityGrid();
		expect(grid[3][2]).toBe(1);
		expect(grid[0][0]).toBe(0);
	});

	it('terrain이 mountain이면 walkable이 false여야 한다', () => {
		const gm = new GridManager(
			makeTerrainMap([
				['plain', 'mountain'],
				['plain', 'plain'],
			]),
		);
		expect(gm.isWalkable(1, 0)).toBe(false);
		expect(gm.getWalkabilityGrid()[0][1]).toBe(1);
	});

	it('getTile이 terrain 값을 포함해야 한다', () => {
		const gm = new GridManager(
			makeTerrainMap([
				['hill', 'plain'],
				['plain', 'bog'],
			]),
		);
		expect(gm.getTile(0, 0)).toMatchObject({ terrain: 'hill' });
		expect(gm.getTile(1, 1)).toMatchObject({ terrain: 'bog' });
	});

	it('getTerrainAt이 좌표의 terrain을 반환해야 한다', () => {
		const gm = new GridManager(
			makeTerrainMap([
				['plain', 'water'],
				['cursed', 'lava'],
			]),
		);
		expect(gm.getTerrainAt(1, 0)).toBe('water');
		expect(gm.getTerrainAt(0, 1)).toBe('cursed');
		expect(gm.getTerrainAt(9, 9)).toBeNull();
	});

	it('getCostGrid가 terrain cost를 반영해야 한다', () => {
		const gm = new GridManager(
			makeTerrainMap([
				['plain', 'road', 'forest'],
				['bog', 'hill', 'water'],
			]),
		);
		const costGrid = gm.getCostGrid();
		expect(costGrid[0]).toEqual([1, 0.9, 1.15]);
		expect(costGrid[1][0]).toBe(1.4);
		expect(costGrid[1][1]).toBe(1);
		expect(costGrid[1][2]).toBe(Number.POSITIVE_INFINITY);
	});
});
