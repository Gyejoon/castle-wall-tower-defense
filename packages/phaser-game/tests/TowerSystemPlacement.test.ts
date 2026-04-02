import { FOREST_GATE_MAP } from '@gld/shared';
import { describe, expect, it, vi } from 'vitest';
import { GridManager } from '../src/systems/GridManager';
import { TowerSystem } from '../src/systems/TowerSystem';

vi.mock('phaser', () => ({
	default: {
		Animations: {
			Events: {
				ANIMATION_COMPLETE: 'animationcomplete',
			},
		},
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

vi.mock('../src/audio/SoundGenerator', () => ({
	soundGenerator: {
		playTowerAttack: vi.fn(),
	},
}));

function createGraphics() {
	return {
		setDepth: vi.fn().mockReturnThis(),
		clear: vi.fn().mockReturnThis(),
		fillStyle: vi.fn().mockReturnThis(),
		fillEllipse: vi.fn().mockReturnThis(),
		strokeEllipse: vi.fn().mockReturnThis(),
		lineStyle: vi.fn().mockReturnThis(),
		fillCircle: vi.fn().mockReturnThis(),
		strokeCircle: vi.fn().mockReturnThis(),
		fillRect: vi.fn().mockReturnThis(),
		beginPath: vi.fn().mockReturnThis(),
		moveTo: vi.fn().mockReturnThis(),
		lineTo: vi.fn().mockReturnThis(),
		strokePath: vi.fn().mockReturnThis(),
		destroy: vi.fn(),
	};
}

function createImage() {
	return {
		setY: vi.fn().mockReturnThis(),
		setDepth: vi.fn().mockReturnThis(),
		destroy: vi.fn(),
	};
}

function createScene() {
	return {
		add: {
			graphics: vi.fn(() => createGraphics()),
			image: vi.fn(() => createImage()),
			sprite: vi.fn(),
		},
		textures: {
			exists: vi.fn(() => false),
		},
		anims: {
			exists: vi.fn(() => false),
		},
	};
}

function createTowerSystem() {
	const scene = createScene();
	const gridManager = new GridManager(FOREST_GATE_MAP);
	const pathfinding = {
		invalidateCache: vi.fn(),
		findPath: vi.fn(() => FOREST_GATE_MAP.path),
	};
	const towerSystem = new TowerSystem(
		scene as never,
		gridManager,
		pathfinding as never,
	);

	return { scene, gridManager, towerSystem, pathfinding };
}

describe('TowerSystem placement contract', () => {
	it('rejects placement on a path tile', () => {
		const { scene, towerSystem } = createTowerSystem();
		const pathPoint = FOREST_GATE_MAP.path[1];

		expect(towerSystem.placeTower(pathPoint.x, pathPoint.y, 'laser')).toEqual({
			success: false,
			reason: 'occupied',
		});
		expect(scene.add.image).not.toHaveBeenCalled();
	});

	it('rejects placement on a blocked-placement tile', () => {
		const { scene, towerSystem } = createTowerSystem();
		const blockedPoint = { x: 0, y: 0 };

		expect(
			towerSystem.placeTower(blockedPoint.x, blockedPoint.y, 'laser'),
		).toEqual({
			success: false,
			reason: 'occupied',
		});
		expect(scene.add.image).not.toHaveBeenCalled();
	});

	it('allows placement on a valid buildable tile', () => {
		const { towerSystem, gridManager } = createTowerSystem();
		const buildablePoint = FOREST_GATE_MAP.buildablePoints[0];

		const result = towerSystem.placeTower(
			buildablePoint.x,
			buildablePoint.y,
			'laser',
		);

		expect(result.success).toBe(true);
		expect(
			gridManager.getTile(buildablePoint.x, buildablePoint.y)?.occupied,
		).toBe(true);
	});
});
