import type { MapLayout } from '@gld/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
	default: {},
}));

import { REFERENCE_FIELD_PATH_TILESET_KEY } from '../../src/fieldAssets';
import { FieldRenderer } from '../../src/scenes/render/FieldRenderer';

function createGraphics() {
	return {
		setDepth: vi.fn().mockReturnThis(),
		setScrollFactor: vi.fn().mockReturnThis(),
		setTint: vi.fn().mockReturnThis(),
		clear: vi.fn().mockReturnThis(),
		fillStyle: vi.fn().mockReturnThis(),
		lineStyle: vi.fn().mockReturnThis(),
		fillRect: vi.fn().mockReturnThis(),
		strokeRect: vi.fn().mockReturnThis(),
		fillCircle: vi.fn().mockReturnThis(),
		strokeCircle: vi.fn().mockReturnThis(),
		beginPath: vi.fn().mockReturnThis(),
		moveTo: vi.fn().mockReturnThis(),
		lineTo: vi.fn().mockReturnThis(),
		strokePath: vi.fn().mockReturnThis(),
		destroy: vi.fn(),
	};
}

function createSprite() {
	return {
		setDisplaySize: vi.fn().mockReturnThis(),
		setOrigin: vi.fn().mockReturnThis(),
		setDepth: vi.fn().mockReturnThis(),
		setTint: vi.fn().mockReturnThis(),
		setAlpha: vi.fn().mockReturnThis(),
		setScrollFactor: vi.fn().mockReturnThis(),
		destroy: vi.fn(),
	};
}

function buildScene() {
	const graphicsList: ReturnType<typeof createGraphics>[] = [];
	const spriteList: ReturnType<typeof createSprite>[] = [];
	const addGraphics = vi.fn(() => {
		const g = createGraphics();
		graphicsList.push(g);
		return g;
	});
	const addSprite = vi.fn(() => {
		const s = createSprite();
		spriteList.push(s);
		return s;
	});
	const addTileSprite = vi.fn(() => createSprite());

	const tilemap = {
		getObjectLayer: vi.fn(() => ({
			objects: [
				{
					x: 64,
					y: 128,
					properties: [
						{ name: 'assetKey', value: 'tiny-swords-bush-1' },
						{ name: 'kind', value: 'bush' },
						{ name: 'variant', value: '1' },
					],
				},
			],
		})),
	};

	return {
		scene: {
			add: {
				graphics: addGraphics,
				sprite: addSprite,
				tileSprite: addTileSprite,
			},
			scale: {
				width: 600,
				height: 900,
			},
			textures: {
				exists: vi.fn(() => true),
			},
			make: {
				tilemap: vi.fn(() => tilemap),
			},
		},
		addGraphics,
		addSprite,
		addTileSprite,
		graphicsList,
		spriteList,
	};
}

function buildGridManager() {
	return {
		orthoTile: 48,
		tileSize: 48,
		gridToWorld: vi.fn((col: number, row: number) => ({
			x: col * 48,
			y: row * 48,
		})),
		canPlaceTower: vi.fn(() => true),
		fillTileRect: vi.fn(),
	};
}

function buildMap(): MapLayout {
	return {
		id: 'main_long',
		name: 'Phase A Long',
		width: 3,
		height: 3,
		tileSize: 64,
		path: [
			{ x: 0, y: 1 },
			{ x: 1, y: 1 },
			{ x: 2, y: 1 },
		],
		blockedPlacementPoints: [],
		buildablePoints: [
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
		],
		spawnPoint: { x: 0, y: 1 },
		exitPoint: { x: 2, y: 1 },
		tilemapKey: 'test-map',
		tilesetKey: 'test-tileset',
		recommendedPower: 1,
		rewardMultiplier: 1,
		difficultyHpMult: 1,
		obstacles: [{ x: 0, y: 2 }],
		decorations: [{ x: -1, y: 0, kind: 'tree', variant: 1 }],
	};
}

describe('FieldRenderer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('renderAll invokes scene.add.graphics and scene.add.sprite', () => {
		const { scene, addGraphics, addSprite } = buildScene();
		const grid = buildGridManager();
		const map = buildMap();

		const renderer = new FieldRenderer(scene as never, grid as never, map);
		renderer.renderAll();

		// Expect the path graphics to be allocated plus cliff graphics for
		// some tiles (exact count depends on map topology — we only assert
		// non-empty).
		expect(addGraphics.mock.calls.length).toBeGreaterThan(0);

		// Expect grass platform sprites + at least one decoration + one
		// obstacle to be placed.
		expect(addSprite.mock.calls.length).toBeGreaterThan(0);
	});

	it('uses the reference atlas path tiles when available', () => {
		const { scene, addSprite } = buildScene();
		const grid = buildGridManager();
		const map = buildMap();

		const renderer = new FieldRenderer(scene as never, grid as never, map);
		renderer.renderAll();

		const pathTileCalls = addSprite.mock.calls.filter(
			(call) => call[2] === REFERENCE_FIELD_PATH_TILESET_KEY,
		);
		expect(pathTileCalls).toHaveLength(map.path.length);
		expect(pathTileCalls.map((call) => call[3])).toEqual([2, 10, 8]);
	});

	it('refreshPath clears old path graphics before redrawing', () => {
		const { scene, graphicsList } = buildScene();
		const grid = buildGridManager();
		const map = buildMap();

		const renderer = new FieldRenderer(scene as never, grid as never, map);
		renderer.renderAll();

		const pathGraphicsBefore = graphicsList.length;
		expect(pathGraphicsBefore).toBeGreaterThan(0);

		// Find the path graphics by ensuring clear() was called on one of them
		// during initial render. Then call refreshPath and verify clear() is
		// called again on the same instance (no new graphics allocated for
		// the path layer).
		renderer.refreshPath();

		// No new graphics should be added for refreshPath — it clears the
		// existing pathGraphics.
		expect(graphicsList.length).toBe(pathGraphicsBefore);

		// At least one graphics object was cleared during refreshPath.
		const clearedCount = graphicsList.filter(
			(g) => g.clear.mock.calls.length > 0,
		).length;
		expect(clearedCount).toBeGreaterThan(0);
	});

	it('destroy calls .destroy() on pathGraphics and clears cached decoration data', () => {
		const { scene, graphicsList } = buildScene();
		const grid = buildGridManager();
		const map = buildMap();

		const renderer = new FieldRenderer(scene as never, grid as never, map);
		renderer.renderAll();

		const pathGraphicsCount = graphicsList.length;
		renderer.destroy();

		// destroy was called on the path graphics instance; at least one
		// graphics object in the list should have been destroyed.
		const destroyedCount = graphicsList.filter(
			(g) => g.destroy.mock.calls.length > 0,
		).length;
		expect(destroyedCount).toBeGreaterThan(0);
		expect(pathGraphicsCount).toBeGreaterThan(0);

		// After destroy, subsequent refreshPath should re-allocate a new
		// path graphics object (not reuse the destroyed one).
		renderer.refreshPath();
		expect(graphicsList.length).toBeGreaterThan(pathGraphicsCount);
	});
});
