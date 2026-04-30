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
		active: true,
		scaleX: 1,
		scaleY: 1,
		x: 0,
		y: 0,
		setDisplaySize: vi.fn().mockReturnThis(),
		setY(y: number) {
			this.y = y;
			return this;
		},
		setScale(x: number, y: number) {
			this.scaleX = x;
			this.scaleY = y ?? x;
			return this;
		},
		setDepth: vi.fn().mockReturnThis(),
		destroy: vi.fn(),
	};
}

/**
 * Scene fake that captures every `tweens.add` call. The punch tween's
 * onComplete fires synchronously so tests can verify the tower returns to its
 * fixed pose without reintroducing continuous idle movement.
 */
function createScene() {
	const addedTweens: Array<Record<string, unknown>> = [];
	return {
		addedTweens,
		add: {
			graphics: vi.fn(() => createGraphics()),
			image: vi.fn(() => createImage()),
			sprite: vi.fn(),
		},
		textures: { exists: vi.fn(() => false) },
		anims: { exists: vi.fn(() => false) },
		tweens: {
			add: vi.fn((config: Record<string, unknown>) => {
				addedTweens.push(config);
				// Fire onComplete synchronously to simulate punch finishing.
				const onComplete = config.onComplete as (() => void) | undefined;
				if (onComplete) onComplete();
				return { stop: vi.fn(), remove: vi.fn() };
			}),
			killTweensOf: vi.fn(),
		},
	};
}

describe('TowerSystem fixed-pose VFX', () => {
	it('playSummonVfx does not restart idle movement after punch', () => {
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
		const p = MAIN_LONG_MAP.buildablePoints[0];
		expect(towerSystem.placeTower(p.x, p.y, 'archer').success).toBe(true);

		// Baseline: placement should not create a continuous idle tween.
		const idleBefore = scene.addedTweens.filter(
			(t) => t.repeat === -1 && t.yoyo === true,
		);
		expect(idleBefore.length).toBe(0);

		towerSystem.playSummonVfx(p.x, p.y);

		const idleAfter = scene.addedTweens.filter(
			(t) => t.repeat === -1 && t.yoyo === true,
		);
		expect(idleAfter.length).toBe(0);
	});

	it('playMergeVfx does not restart idle movement after punch', () => {
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
		const p = MAIN_LONG_MAP.buildablePoints[0];
		expect(towerSystem.placeTower(p.x, p.y, 'archer').success).toBe(true);

		const idleBefore = scene.addedTweens.filter(
			(t) => t.repeat === -1 && t.yoyo === true,
		);
		expect(idleBefore.length).toBe(0);

		towerSystem.playMergeVfx(p.x, p.y);

		const idleAfter = scene.addedTweens.filter(
			(t) => t.repeat === -1 && t.yoyo === true,
		);
		expect(idleAfter.length).toBe(0);
	});
});
