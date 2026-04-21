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
			killTweensOf: vi.fn(),
		},
	};
}

function createTowerSystem() {
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

	return { scene, gridManager, towerSystem, pathfinding };
}

describe('TowerSystem placement contract', () => {
	it('rejects placement on a path tile', () => {
		const { scene, towerSystem } = createTowerSystem();
		const pathPoint = MAIN_LONG_MAP.path[1];

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
		const buildablePoint = MAIN_LONG_MAP.buildablePoints[0];

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
		const buildablePoint = MAIN_LONG_MAP.buildablePoints[0];

		towerSystem.placeTower(buildablePoint.x, buildablePoint.y, 'archer');
		const result = towerSystem.sellTower(buildablePoint.x, buildablePoint.y);

		expect(result.success).toBe(true);
		// archer cost = 20 (T1), 50% = 10
		expect(result.refund).toBe(10);
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

describe('TowerSystem Phase 9 global modifiers (meta atk%)', () => {
	function placeEmpAndTarget(
		system: TowerSystem,
		grid: GridManager,
		time: number,
	): Array<{
		unitId: string;
		damage: number;
		armorPierce?: boolean;
		slow?: { factor: number; duration: number };
		stun?: { duration: number };
	}> {
		// emp tower: beam style (no projectileSpeed), damage=8,
		// slow_30% special → immediate damage events on update().
		const buildable = MAIN_LONG_MAP.buildablePoints[0];
		system.placeTower(buildable.x, buildable.y, 'emp');

		const towerWorld = grid.gridToWorld(buildable.x, buildable.y);
		const unit = {
			instanceId: 'u1',
			x: towerWorld.x,
			y: towerWorld.y,
			hp: 1000,
			element: 'neutral' as const,
		};

		return system.update(time, 16, [unit]);
	}

	it('default globalAtkPct=0 leaves base damage unchanged (emp → 8)', () => {
		const { towerSystem, gridManager } = createTowerSystem();
		const events = placeEmpAndTarget(towerSystem, gridManager, 2000);
		const hit = events.find((e) => e.damage > 0);
		expect(hit).toBeDefined();
		expect(hit?.damage).toBe(8);
	});

	it('setGlobalModifiers({atkPct:0.25}) multiplies damage by 1.25 (8 → 10)', () => {
		const { towerSystem, gridManager } = createTowerSystem();
		towerSystem.setGlobalModifiers({ atkPct: 0.25 });
		const events = placeEmpAndTarget(towerSystem, gridManager, 2000);
		const hit = events.find((e) => e.damage > 0);
		expect(hit).toBeDefined();
		// 8 * 1.25 = 10 (rounded)
		expect(hit?.damage).toBe(10);
	});

	it('setGlobalModifiers compounds with Phase 4 dmg_up stack', () => {
		const { towerSystem, gridManager } = createTowerSystem();
		// +25% meta atk
		towerSystem.setGlobalModifiers({ atkPct: 0.25 });
		// +20% roguelike dmg_up (single stack: 1.20×)
		towerSystem.setModifierFn((id) => {
			if (id === 'dmg_up') return 1.2;
			if (id === 'crit_dmg') return 0;
			return 1;
		});
		const events = placeEmpAndTarget(towerSystem, gridManager, 2000);
		const hit = events.find((e) => e.damage > 0);
		expect(hit).toBeDefined();
		// 8 * 1.20 * 1.25 = 12
		expect(hit?.damage).toBe(12);
	});

	it('setGlobalModifiers replaces (not accumulates) prior atkPct', () => {
		const { towerSystem, gridManager } = createTowerSystem();
		towerSystem.setGlobalModifiers({ atkPct: 0.5 });
		towerSystem.setGlobalModifiers({ atkPct: 0.1 });
		const events = placeEmpAndTarget(towerSystem, gridManager, 2000);
		const hit = events.find((e) => e.damage > 0);
		// 8 * 1.10 = 8.8 → round → 9
		expect(hit?.damage).toBe(9);
	});
});

describe('TowerSystem 정식 모드 merge support (merge stubbed)', () => {
	it('placeTower uses the tower def tier', () => {
		const { towerSystem } = createTowerSystem();
		const p = MAIN_LONG_MAP.buildablePoints[0];
		towerSystem.placeTower(p.x, p.y, 'archer');
		expect(towerSystem.getTowerLocator(p.x, p.y)?.tier).toBe(1);
	});

	it('getTowerLocator returns null for empty tile', () => {
		const { towerSystem } = createTowerSystem();
		expect(towerSystem.getTowerLocator(99, 99)).toBeNull();
	});

	it('getTowerLocator returns instanceId/towerId/family/tier/x/y for placed tower', () => {
		const { towerSystem } = createTowerSystem();
		const p = MAIN_LONG_MAP.buildablePoints[0];
		towerSystem.placeTower(p.x, p.y, 'archer');
		const locator = towerSystem.getTowerLocator(p.x, p.y);
		expect(locator).toMatchObject({
			towerId: 'archer',
			family: 'archer',
			tier: 1,
			x: p.x,
			y: p.y,
		});
		expect(typeof locator?.instanceId).toBe('string');
	});

	it('removeTowerAt clears a placed tower without refund', () => {
		const { towerSystem, gridManager } = createTowerSystem();
		const p = MAIN_LONG_MAP.buildablePoints[0];
		towerSystem.placeTower(p.x, p.y, 'archer');
		expect(towerSystem.removeTowerAt(p.x, p.y)).toBe(true);
		expect(towerSystem.getTowerLocator(p.x, p.y)).toBeNull();
		expect(gridManager.getTile(p.x, p.y)?.occupied).toBe(false);
	});

	it('playSummonVfx adds a scale-punch tween on the tower sprite', () => {
		const { scene, towerSystem } = createTowerSystem();
		const p = MAIN_LONG_MAP.buildablePoints[0];
		towerSystem.placeTower(p.x, p.y, 'archer');
		const tweenAddCallsBefore = scene.tweens.add.mock.calls.length;

		towerSystem.playSummonVfx(p.x, p.y);

		const tweenAddCallsAfter = scene.tweens.add.mock.calls.length;
		expect(tweenAddCallsAfter).toBeGreaterThan(tweenAddCallsBefore);
		const lastCall =
			scene.tweens.add.mock.calls[scene.tweens.add.mock.calls.length - 1][0];
		expect(lastCall.yoyo).toBe(true);
		expect(lastCall.duration).toBeLessThanOrEqual(200);
	});

	it('playSummonVfx is a no-op on empty tile', () => {
		const { scene, towerSystem } = createTowerSystem();
		const before = scene.tweens.add.mock.calls.length;
		expect(() => towerSystem.playSummonVfx(99, 99)).not.toThrow();
		expect(scene.tweens.add.mock.calls.length).toBe(before);
	});

	it('playMergeVfx adds scale punch + gold tint on the kept tower', () => {
		const { scene, towerSystem } = createTowerSystem();
		const p = MAIN_LONG_MAP.buildablePoints[0];
		towerSystem.placeTower(p.x, p.y, 'archer');
		const before = scene.tweens.add.mock.calls.length;

		towerSystem.playMergeVfx(p.x, p.y);

		// Two tweens added: scale punch + tint cleanup counter
		expect(scene.tweens.add.mock.calls.length).toBe(before + 2);
	});
});
