import { PHASE_A_LONG_MAP } from '@gld/shared';
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
 * Scene fake that captures every `tweens.add` call so tests can interrogate
 * whether an idle (repeat: -1) tween is present after the punch animation.
 * The punch tween's onComplete fires synchronously at construction so we
 * don't need a real Phaser tween manager.
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

describe('TowerSystem VFX idle-tween restart', () => {
	it('playPhaseASummonVfx restarts the idle breathing tween after punch', () => {
		const scene = createScene();
		const gridManager = new GridManager(PHASE_A_LONG_MAP);
		const pathfinding = {
			invalidateCache: vi.fn(),
			findPath: vi.fn(() => PHASE_A_LONG_MAP.path),
		};
		const towerSystem = new TowerSystem(
			scene as never,
			gridManager,
			pathfinding as never,
		);
		const p = PHASE_A_LONG_MAP.buildablePoints[0];
		expect(towerSystem.placeTower(p.x, p.y, 'archer').success).toBe(true);

		// Baseline: initial placement created exactly one idle tween
		// (repeat: -1, yoyo: true).
		const idleBefore = scene.addedTweens.filter(
			(t) => t.repeat === -1 && t.yoyo === true,
		);
		expect(idleBefore.length).toBe(1);

		towerSystem.playPhaseASummonVfx(p.x, p.y);

		// After the punch tween's onComplete fires synchronously, the idle
		// tween should have been re-added — so we now have 2 repeat:-1 tweens.
		const idleAfter = scene.addedTweens.filter(
			(t) => t.repeat === -1 && t.yoyo === true,
		);
		expect(idleAfter.length).toBe(2);
	});

	it('playPhaseAMergeVfx restarts the idle breathing tween after punch', () => {
		const scene = createScene();
		const gridManager = new GridManager(PHASE_A_LONG_MAP);
		const pathfinding = {
			invalidateCache: vi.fn(),
			findPath: vi.fn(() => PHASE_A_LONG_MAP.path),
		};
		const towerSystem = new TowerSystem(
			scene as never,
			gridManager,
			pathfinding as never,
		);
		const p = PHASE_A_LONG_MAP.buildablePoints[0];
		expect(towerSystem.placeTower(p.x, p.y, 'archer').success).toBe(true);

		const idleBefore = scene.addedTweens.filter(
			(t) => t.repeat === -1 && t.yoyo === true,
		);
		expect(idleBefore.length).toBe(1);

		towerSystem.playPhaseAMergeVfx(p.x, p.y);

		const idleAfter = scene.addedTweens.filter(
			(t) => t.repeat === -1 && t.yoyo === true,
		);
		expect(idleAfter.length).toBe(2);
	});
});
