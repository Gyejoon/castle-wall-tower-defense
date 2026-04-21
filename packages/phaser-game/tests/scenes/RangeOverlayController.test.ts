import type { MapLayout } from '@gld/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
	default: {},
}));

import { RangeOverlayController } from '../../src/scenes/render/RangeOverlayController';

function createGraphics() {
	return {
		setDepth: vi.fn().mockReturnThis(),
		setAlpha: vi.fn().mockReturnThis(),
		clear: vi.fn().mockReturnThis(),
		fillStyle: vi.fn().mockReturnThis(),
		lineStyle: vi.fn().mockReturnThis(),
		fillCircle: vi.fn().mockReturnThis(),
		strokeCircle: vi.fn().mockReturnThis(),
		fillRect: vi.fn().mockReturnThis(),
		strokeRect: vi.fn().mockReturnThis(),
		destroy: vi.fn(),
	};
}

function buildScene() {
	const graphicsList: ReturnType<typeof createGraphics>[] = [];
	const addGraphics = vi.fn(() => {
		const g = createGraphics();
		graphicsList.push(g);
		return g;
	});
	const tweens = {
		add: vi.fn(() => ({ stop: vi.fn(), remove: vi.fn() })),
		killTweensOf: vi.fn(),
	};

	return {
		scene: {
			add: { graphics: addGraphics },
			tweens,
		},
		addGraphics,
		tweens,
		graphicsList,
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
		id: 'phase_a_long',
		name: 'Phase A Long',
		width: 3,
		height: 3,
		tileSize: 48,
		path: [
			{ x: 0, y: 1 },
			{ x: 1, y: 1 },
			{ x: 2, y: 1 },
		],
		blockedPlacementPoints: [],
		buildablePoints: [
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
			{ x: 2, y: 0 },
		],
		spawnPoint: { x: 0, y: 1 },
		exitPoint: { x: 2, y: 1 },
		tilemapKey: 'test-map',
		tilesetKey: 'test-tileset',
		recommendedPower: 1,
		rewardMultiplier: 1,
		difficultyHpMult: 1,
	};
}

describe('RangeOverlayController', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('constructor allocates 3 graphics (hover, selection, range overlay)', () => {
		const { scene, graphicsList } = buildScene();
		const grid = buildGridManager();
		const map = buildMap();

		// biome-ignore lint/correctness/noUnusedVariables: construction-only
		const controller = new RangeOverlayController(
			scene as never,
			grid as never,
			map,
		);

		expect(graphicsList).toHaveLength(3);
	});

	it('drawRangeOverlay produces fillCircle and strokeCircle calls sized by range', () => {
		const { scene, graphicsList } = buildScene();
		const grid = buildGridManager();
		const map = buildMap();

		const controller = new RangeOverlayController(
			scene as never,
			grid as never,
			map,
		);

		// The range overlay graphics is the 3rd one allocated in the ctor.
		const rangeGfx = graphicsList[2];
		controller.drawRangeOverlay(1, 1, 3);

		expect(rangeGfx.clear).toHaveBeenCalled();
		// range=3 on tile=48 => radius 144 at grid(1,1)=(48,48)
		expect(rangeGfx.fillCircle).toHaveBeenCalledWith(48, 48, 144);
		expect(rangeGfx.strokeCircle).toHaveBeenCalledWith(48, 48, 144);
	});

	it('clearRangeOverlay schedules a fade tween on the range graphics', () => {
		const { scene, graphicsList, tweens } = buildScene();
		const grid = buildGridManager();
		const map = buildMap();

		const controller = new RangeOverlayController(
			scene as never,
			grid as never,
			map,
		);

		const rangeGfx = graphicsList[2];
		controller.clearRangeOverlay();

		expect(tweens.killTweensOf).toHaveBeenCalledWith(rangeGfx);
		expect(tweens.add).toHaveBeenCalled();
		const tweenArgs = tweens.add.mock.calls[0]?.[0] as {
			targets: unknown;
			alpha: number;
		};
		expect(tweenArgs.targets).toBe(rangeGfx);
		expect(tweenArgs.alpha).toBe(0);
	});

	it('showBuildableZone is idempotent (safe to call twice)', () => {
		const { scene, graphicsList } = buildScene();
		const grid = buildGridManager();
		const map = buildMap();

		const controller = new RangeOverlayController(
			scene as never,
			grid as never,
			map,
		);

		const graphicsBefore = graphicsList.length;
		controller.showBuildableZone('archer');
		const graphicsAfterFirst = graphicsList.length;
		// A new graphics object (the buildableZoneGraphics) should have been
		// allocated on first call.
		expect(graphicsAfterFirst).toBe(graphicsBefore + 1);

		controller.showBuildableZone('archer');
		// Second call must NOT allocate a new graphics — it reuses the
		// buildableZoneGraphics lazily created in the first call.
		expect(graphicsList.length).toBe(graphicsAfterFirst);
	});

	it('hideBuildableZone is safe before showBuildableZone was ever called', () => {
		const { scene, graphicsList } = buildScene();
		const grid = buildGridManager();
		const map = buildMap();

		const controller = new RangeOverlayController(
			scene as never,
			grid as never,
			map,
		);

		const graphicsBefore = graphicsList.length;
		expect(() => controller.hideBuildableZone()).not.toThrow();
		// No graphics allocated by the defensive hideBuildableZone.
		expect(graphicsList.length).toBe(graphicsBefore);
	});

	it('showBuildableZone with null clears the existing highlight', () => {
		const { scene, graphicsList } = buildScene();
		const grid = buildGridManager();
		const map = buildMap();

		const controller = new RangeOverlayController(
			scene as never,
			grid as never,
			map,
		);

		controller.showBuildableZone('archer');
		const buildableGfx = graphicsList[graphicsList.length - 1];
		buildableGfx.clear.mockClear();

		controller.showBuildableZone(null);
		expect(buildableGfx.clear).toHaveBeenCalled();
	});

	it('destroy destroys all 4 Graphics objects', () => {
		const { scene, graphicsList } = buildScene();
		const grid = buildGridManager();
		const map = buildMap();

		const controller = new RangeOverlayController(
			scene as never,
			grid as never,
			map,
		);

		// Force creation of the lazy buildableZoneGraphics so destroy has 4
		// graphics to handle.
		controller.showBuildableZone('archer');
		expect(graphicsList).toHaveLength(4);

		controller.destroy();
		for (const gfx of graphicsList) {
			expect(gfx.destroy).toHaveBeenCalled();
		}
	});
});
