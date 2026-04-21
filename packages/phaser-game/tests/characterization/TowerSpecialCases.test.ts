import { describe, expect, it, vi } from 'vitest';

// Canonical Phaser/SoundGenerator/EventBus mocks — same pattern as
// tests/SiegeProjectileVfx.test.ts so TowerSystem can be constructed in a
// node-only runner.
vi.mock('phaser', () => ({
	default: {
		Animations: { Events: { ANIMATION_COMPLETE: 'animationcomplete' } },
		GameObjects: { Events: { DESTROY: 'destroy' } },
	},
}));
vi.mock('../../src/audio/SoundGenerator', () => ({
	soundGenerator: { playTowerAttack: vi.fn(), playArrowImpact: vi.fn() },
}));
vi.mock('../../src/EventBus', () => ({ EventBus: { emit: vi.fn() } }));

import { TowerSystem } from '../../src/systems/TowerSystem';

// Mirror SiegeProjectileVfx.test.ts helpers — minimal Phaser-ish stubs that
// satisfy TowerSystem's render/audio calls without a real scene.
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
		setPosition: vi.fn().mockReturnThis(),
		setRotation: vi.fn().mockReturnThis(),
		setAlpha: vi.fn().mockReturnThis(),
		setY: vi.fn().mockReturnThis(),
		setDepth: vi.fn().mockReturnThis(),
		setVisible: vi.fn().mockReturnThis(),
		visible: false,
		active: true,
		x: 100,
		y: 100,
		rotation: 0,
		destroy: vi.fn(),
	};
}

function createSprite() {
	return {
		setDisplaySize: vi.fn().mockReturnThis(),
		setDepth: vi.fn().mockReturnThis(),
		setY: vi.fn().mockReturnThis(),
		setPosition: vi.fn().mockReturnThis(),
		setTint: vi.fn().mockReturnThis(),
		clearTint: vi.fn().mockReturnThis(),
		setRotation: vi.fn().mockReturnThis(),
		setVisible: vi.fn().mockReturnThis(),
		play: vi.fn().mockReturnThis(),
		once: vi.fn(),
		active: true,
		scaleX: 1,
		scaleY: 1,
		x: 100,
		y: 100,
		rotation: 0,
		destroy: vi.fn(),
	};
}

/**
 * Build a scene that claims the given texture keys exist. Nova cannon needs
 * `tower-nova_cannon-barrel` to be present so the rotating barrel sprite is
 * created and the fireOrigin formula at TowerSystem.ts:774-781 is exercised.
 */
function buildScene(existsKeys: Set<string> = new Set()) {
	return {
		scene: {
			add: {
				graphics: vi.fn(() => createGraphics()),
				image: vi.fn(() => createImage()),
				sprite: vi.fn(() => createSprite()),
			},
			textures: {
				exists: vi.fn((key: string) => existsKeys.has(key)),
			},
			anims: {
				exists: vi.fn(() => false),
			},
			tweens: {
				add: vi.fn(() => ({ stop: vi.fn(), remove: vi.fn() })),
			},
		},
	};
}

function buildGridManager() {
	return {
		orthoTile: 48,
		isInBounds: vi.fn(() => true),
		isWalkable: vi.fn(() => true),
		canPlaceTower: vi.fn(() => true),
		placeTower: vi.fn(() => true),
		removeTower: vi.fn(),
		getWalkabilityGrid: vi.fn(() => []),
		spawnPoint: { x: 0, y: 0 },
		exitPoint: { x: 4, y: 17 },
		gridToWorld: vi.fn((col: number, row: number) => ({
			x: col * 48,
			y: row * 48,
		})),
		getDepth: vi.fn(() => 10),
		worldToGridFloat: vi.fn((x: number, y: number) => ({
			x: x / 48,
			y: y / 48,
		})),
	};
}

const pathfinding = {
	invalidateCache: vi.fn(),
	findPath: vi.fn(() => [
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
	]),
};

interface AttackLine {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	style: 'beam' | 'arc' | 'arrow';
	towerType?: string;
	impactPending?: boolean;
	pendingDamage?: Array<{ unitId: string; damage: number }>;
}

function getAttackLines(towerSystem: TowerSystem): AttackLine[] {
	return (towerSystem as unknown as { attackLines: AttackLine[] }).attackLines;
}

// Characterization: pins the three special-case tower branches in
// TowerSystem.update() that the refactor (Phase 2.3 / 2.4) will extract into
// strategy classes. If any of these assertions breaks, the extraction has
// dropped a behavior the player relied on.

describe('TowerSystem special-case tower VFX (characterization)', () => {
	it('twin_archer fires two arrow projectiles, each half damage', () => {
		const { scene } = buildScene();
		const gridManager = buildGridManager();
		const towerSystem = new TowerSystem(
			scene as never,
			gridManager as never,
			pathfinding as never,
		);

		const placement = towerSystem.placeTower(1, 0, 'twin_archer');
		expect(placement.success).toBe(true);

		towerSystem.update(10_000, 16, [
			{
				instanceId: 'enemy_1',
				x: 2 * 48,
				y: 0,
				hp: 100,
				element: 'neutral',
			} as never,
		]);

		const lines = getAttackLines(towerSystem);
		// Shot-count branch at :784 — twin_archer emits 2 projectile lines.
		expect(lines).toHaveLength(2);
		for (const line of lines) {
			expect(line.style).toBe('arrow');
			expect(line.towerType).toBe('twin_archer');
		}
		// Damage split at :787-791 — each shot gets baseDamage/2 rounded.
		// twin_archer base damage is 10 @ level 1 → each shot 5.
		const damages = lines.map((l) => l.pendingDamage?.[0]?.damage ?? 0);
		expect(damages).toEqual([5, 5]);
	});

	it('nova_cannon fires an arc projectile from the barrel tip offset', () => {
		// Enable the barrel texture so the rotating-barrel branch at
		// TowerSystem.ts:313-324 creates the barrel sprite.
		const { scene } = buildScene(new Set(['tower-nova_cannon-barrel']));
		const gridManager = buildGridManager();
		const towerSystem = new TowerSystem(
			scene as never,
			gridManager as never,
			pathfinding as never,
		);

		const placement = towerSystem.placeTower(1, 0, 'nova_cannon');
		expect(placement.success).toBe(true);

		// Target directly right of the tower: rotation remains atan2(0, +dx)=0
		// so the barrel-tip formula simplifies to x1 = barrel.x + 10, y1 = barrel.y.
		towerSystem.update(10_000, 16, [
			{
				instanceId: 'enemy_1',
				x: 3 * 48,
				y: 0,
				hp: 100,
				element: 'neutral',
			} as never,
		]);

		const lines = getAttackLines(towerSystem);
		expect(lines.length).toBeGreaterThan(0);
		expect(lines[0].style).toBe('arc');
		expect(lines[0].towerType).toBe('nova_cannon');

		// Characterization of the fireOrigin math at TowerSystem.ts:774-781.
		// In the test scene, the shared createImage() stub returns x=100,y=100
		// and the rotation assignment lands on 0 (target is directly east).
		// So fireOriginX = 100 + cos(0)*10 = 110, fireOriginY = 100 + sin(0)*10 = 100.
		expect(lines[0].x1).toBeCloseTo(110);
		expect(lines[0].y1).toBeCloseTo(100);
	});

	it('earth_golem fires an arc projectile (splash + id branch forces arc)', () => {
		const { scene } = buildScene();
		const gridManager = buildGridManager();
		const towerSystem = new TowerSystem(
			scene as never,
			gridManager as never,
			pathfinding as never,
		);

		const placement = towerSystem.placeTower(1, 0, 'earth_golem');
		expect(placement.success).toBe(true);

		towerSystem.update(10_000, 16, [
			{
				instanceId: 'enemy_1',
				x: 2 * 48,
				y: 0,
				hp: 100,
				element: 'neutral',
			} as never,
		]);

		const lines = getAttackLines(towerSystem);
		// Characterization of the `def.id === 'earth_golem'` branch at :732 —
		// earth_golem must render as arc-style even if a future refactor drops
		// `splash_` from its special string.
		expect(lines.length).toBeGreaterThan(0);
		expect(lines[0].style).toBe('arc');
		expect(lines[0].towerType).toBe('earth_golem');
		expect(lines[0].impactPending).toBe(true);
	});
});
