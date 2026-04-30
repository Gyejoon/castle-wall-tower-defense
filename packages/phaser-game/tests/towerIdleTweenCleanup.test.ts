import { MAIN_LONG_MAP } from '@gld/shared';
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
		setDisplaySize: vi.fn().mockReturnThis(),
		setY: vi.fn().mockReturnThis(),
		setDepth: vi.fn().mockReturnThis(),
		destroy: vi.fn(),
	};
}

function createScene() {
	const tween = { stop: vi.fn(), remove: vi.fn() };
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
		tweens: {
			add: vi.fn(() => tween),
		},
		tween,
	};
}

function attachIdleTween(
	towerSystem: TowerSystem,
	tween: { stop: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> },
) {
	const internals = towerSystem as unknown as {
		towers: Map<string, { idleTween?: typeof tween }>;
	};
	const instance = Array.from(internals.towers.values())[0];
	expect(instance).toBeDefined();
	instance.idleTween = tween;
}

describe('TowerSystem idle tween cleanup', () => {
	it('stops and removes idle tween when selling a tower', () => {
		const scene = createScene();
		const gridManager = new GridManager(MAIN_LONG_MAP);
		const pathfinding = {
			invalidateCache: vi.fn(),
			findPath: vi.fn(() => MAIN_LONG_MAP.path),
		};
		const towerSystem = new TowerSystem(
			scene as never,
			gridManager,
			pathfinding as never,
		);
		const buildablePoint = MAIN_LONG_MAP.buildablePoints[0];

		expect(
			towerSystem.placeTower(buildablePoint.x, buildablePoint.y, 'archer')
				.success,
		).toBe(true);
		attachIdleTween(towerSystem, scene.tween);
		towerSystem.sellTower(buildablePoint.x, buildablePoint.y);

		expect(scene.tween.stop).toHaveBeenCalledTimes(1);
		expect(scene.tween.remove).toHaveBeenCalledTimes(1);
	});

	it('stops and removes idle tweens when destroying the system', () => {
		const scene = createScene();
		const gridManager = new GridManager(MAIN_LONG_MAP);
		const pathfinding = {
			invalidateCache: vi.fn(),
			findPath: vi.fn(() => MAIN_LONG_MAP.path),
		};
		const towerSystem = new TowerSystem(
			scene as never,
			gridManager,
			pathfinding as never,
		);
		const buildablePoint = MAIN_LONG_MAP.buildablePoints[0];

		expect(
			towerSystem.placeTower(buildablePoint.x, buildablePoint.y, 'archer')
				.success,
		).toBe(true);
		attachIdleTween(towerSystem, scene.tween);
		towerSystem.destroy();

		expect(scene.tween.stop).toHaveBeenCalledTimes(1);
		expect(scene.tween.remove).toHaveBeenCalledTimes(1);
	});
});
