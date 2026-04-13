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
			add: vi.fn(() => ({ stop: vi.fn(), remove: vi.fn() })),
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

		expect(towerSystem.placeTower(pathPoint.x, pathPoint.y, 'archer')).toEqual({
			success: false,
			reason: 'occupied',
		});
		expect(scene.add.image).not.toHaveBeenCalled();
	});

	it('rejects placement on a blocked-placement tile', () => {
		const { scene, towerSystem } = createTowerSystem();
		const blockedPoint = { x: 0, y: 0 };

		expect(
			towerSystem.placeTower(blockedPoint.x, blockedPoint.y, 'archer'),
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
			'archer',
		);

		expect(result.success).toBe(true);
		expect(
			gridManager.getTile(buildablePoint.x, buildablePoint.y)?.occupied,
		).toBe(true);
	});

	it('sellTower returns 50% refund and frees tile', () => {
		const { towerSystem, gridManager } = createTowerSystem();
		const buildablePoint = FOREST_GATE_MAP.buildablePoints[0];

		towerSystem.placeTower(buildablePoint.x, buildablePoint.y, 'archer');
		const result = towerSystem.sellTower(buildablePoint.x, buildablePoint.y);

		expect(result.success).toBe(true);
		// archer cost = 10, 50% = 5
		expect(result.refund).toBe(5);
		expect(
			gridManager.getTile(buildablePoint.x, buildablePoint.y)?.occupied,
		).toBe(false);
	});

	it('sellTower fails on empty tile', () => {
		const { towerSystem } = createTowerSystem();
		const result = towerSystem.sellTower(3, 3);

		expect(result).toEqual({ success: false, refund: 0 });
	});
});

describe('TowerSystem Phase A merge support', () => {
	it('placeTower with gradeOverride uses the override instead of collection', () => {
		const { towerSystem } = createTowerSystem();
		const p = FOREST_GATE_MAP.buildablePoints[0];
		const result = towerSystem.placeTower(p.x, p.y, 'archer', {
			gradeOverride: 'rare',
		});
		expect(result.success).toBe(true);
		expect(towerSystem.getTowerLocator(p.x, p.y)?.grade).toBe('rare');
	});

	it('placeTower without options falls back to normal grade', () => {
		const { towerSystem } = createTowerSystem();
		const p = FOREST_GATE_MAP.buildablePoints[0];
		towerSystem.placeTower(p.x, p.y, 'archer');
		expect(towerSystem.getTowerLocator(p.x, p.y)?.grade).toBe('normal');
	});

	it('getTowerLocator returns null for empty tile', () => {
		const { towerSystem } = createTowerSystem();
		expect(towerSystem.getTowerLocator(99, 99)).toBeNull();
	});

	it('getTowerLocator returns col/row/towerId/grade for placed tower', () => {
		const { towerSystem } = createTowerSystem();
		const p = FOREST_GATE_MAP.buildablePoints[0];
		towerSystem.placeTower(p.x, p.y, 'archer');
		expect(towerSystem.getTowerLocator(p.x, p.y)).toEqual({
			col: p.x,
			row: p.y,
			towerId: 'archer',
			grade: 'normal',
		});
	});

	it('applyMerge removes one tower and upgrades the other', () => {
		const { towerSystem, gridManager } = createTowerSystem();
		const p1 = FOREST_GATE_MAP.buildablePoints[0];
		const p2 = FOREST_GATE_MAP.buildablePoints[1];
		towerSystem.placeTower(p1.x, p1.y, 'archer');
		towerSystem.placeTower(p2.x, p2.y, 'archer');

		const ok = towerSystem.applyMerge(p1.x, p1.y, p2.x, p2.y, 'rare');

		expect(ok).toBe(true);
		expect(towerSystem.getTowerLocator(p1.x, p1.y)).toBeNull();
		expect(gridManager.getTile(p1.x, p1.y)?.occupied).toBe(false);
		expect(towerSystem.getTowerLocator(p2.x, p2.y)?.grade).toBe('rare');
		expect(gridManager.getTile(p2.x, p2.y)?.occupied).toBe(true);
	});

	it('applyMerge fails when either tile is empty', () => {
		const { towerSystem } = createTowerSystem();
		const p = FOREST_GATE_MAP.buildablePoints[0];
		towerSystem.placeTower(p.x, p.y, 'archer');
		// removed empty
		expect(towerSystem.applyMerge(99, 99, p.x, p.y, 'rare')).toBe(false);
		// kept empty
		expect(towerSystem.applyMerge(p.x, p.y, 99, 99, 'rare')).toBe(false);
	});

	it('applyMerge rejects same-tile call as defensive guard', () => {
		const { towerSystem } = createTowerSystem();
		const p = FOREST_GATE_MAP.buildablePoints[0];
		towerSystem.placeTower(p.x, p.y, 'archer');
		expect(towerSystem.applyMerge(p.x, p.y, p.x, p.y, 'rare')).toBe(false);
		// tower still there at original grade
		expect(towerSystem.getTowerLocator(p.x, p.y)?.grade).toBe('normal');
	});

	it('playPhaseASummonVfx adds a scale-punch tween on the tower sprite', () => {
		const { scene, towerSystem } = createTowerSystem();
		const p = FOREST_GATE_MAP.buildablePoints[0];
		towerSystem.placeTower(p.x, p.y, 'archer');
		const tweenAddCallsBefore = scene.tweens.add.mock.calls.length;

		towerSystem.playPhaseASummonVfx(p.x, p.y);

		const tweenAddCallsAfter = scene.tweens.add.mock.calls.length;
		expect(tweenAddCallsAfter).toBeGreaterThan(tweenAddCallsBefore);
		const lastCall =
			scene.tweens.add.mock.calls[scene.tweens.add.mock.calls.length - 1][0];
		expect(lastCall.yoyo).toBe(true);
		expect(lastCall.duration).toBeLessThanOrEqual(200);
	});

	it('playPhaseASummonVfx is a no-op on empty tile', () => {
		const { scene, towerSystem } = createTowerSystem();
		const before = scene.tweens.add.mock.calls.length;
		expect(() => towerSystem.playPhaseASummonVfx(99, 99)).not.toThrow();
		expect(scene.tweens.add.mock.calls.length).toBe(before);
	});

	it('playPhaseAMergeVfx adds scale punch + gold tint on the kept tower', () => {
		const { scene, towerSystem } = createTowerSystem();
		const p = FOREST_GATE_MAP.buildablePoints[0];
		towerSystem.placeTower(p.x, p.y, 'archer');
		const before = scene.tweens.add.mock.calls.length;

		towerSystem.playPhaseAMergeVfx(p.x, p.y);

		// Two tweens added: scale punch + tint cleanup counter
		expect(scene.tweens.add.mock.calls.length).toBe(before + 2);
	});
});
