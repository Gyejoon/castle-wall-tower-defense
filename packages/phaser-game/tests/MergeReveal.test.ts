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
		lineStyle: vi.fn().mockReturnThis(),
		fillCircle: vi.fn().mockReturnThis(),
		strokeCircle: vi.fn().mockReturnThis(),
		fillRect: vi.fn().mockReturnThis(),
		fillEllipse: vi.fn().mockReturnThis(),
		strokeEllipse: vi.fn().mockReturnThis(),
		beginPath: vi.fn().mockReturnThis(),
		moveTo: vi.fn().mockReturnThis(),
		lineTo: vi.fn().mockReturnThis(),
		strokePath: vi.fn().mockReturnThis(),
		setAlpha: vi.fn().mockReturnThis(),
		destroy: vi.fn(),
	};
}

function createImage() {
	return {
		setDisplaySize: vi.fn().mockReturnThis(),
		setY: vi.fn().mockReturnThis(),
		setDepth: vi.fn().mockReturnThis(),
		setTexture: vi.fn().mockReturnThis(),
		setTint: vi.fn().mockReturnThis(),
		clearTint: vi.fn().mockReturnThis(),
		scaleX: 1,
		scaleY: 1,
		destroy: vi.fn(),
	};
}

function createScene() {
	const flash = vi.fn();
	const tweenAdd = vi.fn(() => ({ stop: vi.fn(), remove: vi.fn() }));
	return {
		flash,
		tweenAdd,
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
			add: tweenAdd,
			killTweensOf: vi.fn(),
		},
		cameras: {
			main: {
				flash,
			},
		},
	};
}

function createTowerSystem() {
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
	return { scene, gridManager, towerSystem, pathfinding };
}

describe('Phase 11 Task 11.2 — playMergeRevealVfx', () => {
	it('does nothing for sub-tier-5 merges', () => {
		const { towerSystem, scene } = createTowerSystem();
		const buildable = PHASE_A_LONG_MAP.buildablePoints[0];
		towerSystem.placeTower(buildable.x, buildable.y, 'archer');
		// Reset call counts so we only see VFX-triggered calls below.
		scene.flash.mockClear();
		const tweenAddCallsBefore = scene.tweenAdd.mock.calls.length;

		towerSystem.playMergeRevealVfx(buildable.x, buildable.y, 4);

		expect(scene.flash).not.toHaveBeenCalled();
		expect(scene.tweenAdd.mock.calls.length).toBe(tweenAddCallsBefore);
	});

	it('on tier-5 merge: flashes camera, scale-punches sprite, adds expanding ring', () => {
		const { towerSystem, scene } = createTowerSystem();
		const buildable = PHASE_A_LONG_MAP.buildablePoints[0];
		towerSystem.placeTower(buildable.x, buildable.y, 'archer');
		scene.flash.mockClear();
		const ringGraphicsBefore = scene.add.graphics.mock.calls.length;

		towerSystem.playMergeRevealVfx(buildable.x, buildable.y, 5);

		// Camera flash fired exactly once with the spec'd colour/duration.
		expect(scene.flash).toHaveBeenCalledTimes(1);
		expect(scene.flash).toHaveBeenCalledWith(300, 255, 255, 255, false);

		// Scale-punch tween + ring expansion tween both queued.
		const tweenTargets = scene.tweenAdd.mock.calls.map((c) => c[0]);
		const scalePunch = tweenTargets.find(
			(t) =>
				typeof t === 'object' &&
				t !== null &&
				'ease' in t &&
				(t as { ease?: string }).ease === 'Back.easeOut',
		);
		expect(scalePunch).toBeDefined();
		const ringExpand = tweenTargets.find(
			(t) =>
				typeof t === 'object' &&
				t !== null &&
				'alpha' in t &&
				(t as { alpha?: { from: number; to: number } }).alpha?.to === 0,
		);
		expect(ringExpand).toBeDefined();

		// One extra graphics added for the ring stand-in.
		expect(scene.add.graphics.mock.calls.length).toBeGreaterThan(
			ringGraphicsBefore,
		);
	});

	it('on tier-6 merge: adds two concentric rings (tier-6 emphasis)', () => {
		const { towerSystem, scene } = createTowerSystem();
		const buildable = PHASE_A_LONG_MAP.buildablePoints[0];
		towerSystem.placeTower(buildable.x, buildable.y, 'archer');
		const graphicsCallsBefore = scene.add.graphics.mock.calls.length;

		towerSystem.playMergeRevealVfx(buildable.x, buildable.y, 6);

		// tier-5 path adds 1 ring, tier-6 path adds 2.
		const newGraphics =
			scene.add.graphics.mock.calls.length - graphicsCallsBefore;
		expect(newGraphics).toBe(2);
	});

	it('no-ops when no tower exists at the target tile', () => {
		const { towerSystem, scene } = createTowerSystem();
		expect(() => towerSystem.playMergeRevealVfx(99, 99, 6)).not.toThrow();
		expect(scene.flash).not.toHaveBeenCalled();
	});

	it('tolerates a scene with no cameras.main (test stub)', () => {
		const { towerSystem, scene } = createTowerSystem();
		const buildable = PHASE_A_LONG_MAP.buildablePoints[0];
		towerSystem.placeTower(buildable.x, buildable.y, 'archer');
		// Strip camera plugin entirely.
		(scene as unknown as { cameras?: unknown }).cameras = undefined;

		expect(() =>
			towerSystem.playMergeRevealVfx(buildable.x, buildable.y, 5),
		).not.toThrow();
	});
});
