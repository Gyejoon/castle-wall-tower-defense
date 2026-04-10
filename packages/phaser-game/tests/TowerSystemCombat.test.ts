import { FOREST_GATE_MAP, type OwnedTower } from '@gld/shared';
import { describe, expect, it, vi } from 'vitest';
import { GridManager } from '../src/systems/GridManager';
import { TowerSystem } from '../src/systems/TowerSystem';

vi.mock('phaser', () => ({
	default: {
		Animations: {
			Events: { ANIMATION_COMPLETE: 'animationcomplete' },
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
	soundGenerator: { playTowerAttack: vi.fn(), playArrowImpact: vi.fn() },
}));

function createGraphics() {
	return {
		setDepth: vi.fn().mockReturnThis(),
		clear: vi.fn().mockReturnThis(),
		fillStyle: vi.fn().mockReturnThis(),
		fillCircle: vi.fn().mockReturnThis(),
		strokeCircle: vi.fn().mockReturnThis(),
		fillRect: vi.fn().mockReturnThis(),
		lineStyle: vi.fn().mockReturnThis(),
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
		setVisible: vi.fn().mockReturnThis(),
		setPosition: vi.fn().mockReturnThis(),
		setRotation: vi.fn().mockReturnThis(),
		setAlpha: vi.fn().mockReturnThis(),
		setDisplaySize: vi.fn().mockReturnThis(),
		visible: false,
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
		textures: { exists: vi.fn(() => false) },
		anims: { exists: vi.fn(() => false) },
		tweens: {
			add: vi.fn(() => ({ stop: vi.fn(), remove: vi.fn() })),
		},
	};
}

function createTowerSystem(collection?: OwnedTower[]) {
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
		collection,
	);
	return { scene, gridManager, towerSystem };
}

function makeOwned(
	defId: string,
	level: number,
	grade: OwnedTower['grade'] = 'normal',
): OwnedTower {
	return {
		defId,
		level,
		grade,
		acquiredAt: 0,
		awakening: 0,
		duplicateCount: 0,
	};
}

/** Place a tower on a buildable tile and return world position of that tile */
function placeTowerAndGetWorld(
	towerSystem: TowerSystem,
	gridManager: GridManager,
	towerDefId: string,
) {
	// Find first buildable tile
	for (let y = 0; y < FOREST_GATE_MAP.height; y++) {
		for (let x = 0; x < FOREST_GATE_MAP.width; x++) {
			const result = towerSystem.placeTower(x, y, towerDefId);
			if (result.success) {
				return { gridX: x, gridY: y, world: gridManager.gridToWorld(x, y) };
			}
		}
	}
	throw new Error(`No buildable tile found for ${towerDefId}`);
}

describe('TowerSystem combat', () => {
	it('applies element multiplier: fire tower vs fire enemy = 1.0x', () => {
		const { towerSystem, gridManager } = createTowerSystem();
		const pos = placeTowerAndGetWorld(towerSystem, gridManager, 'flame_tower');

		const unitWorld = gridManager.gridToWorld(pos.gridX, pos.gridY + 1);
		const events = towerSystem.update(1000, 16, [
			{
				instanceId: 'u1',
				x: unitWorld.x,
				y: unitWorld.y,
				hp: 100,
				element: 'fire',
			},
		]);

		const damageEvt = events.find((e) => e.unitId === 'u1' && e.damage > 0);
		expect(damageEvt).toBeDefined();
		// flame_tower damage=40, fire vs fire=1.0x → 40
		expect(damageEvt?.damage).toBe(40);
	});

	it('applies element multiplier: fire tower vs lightning enemy = 1.3x', () => {
		const { towerSystem, gridManager } = createTowerSystem();
		const pos = placeTowerAndGetWorld(towerSystem, gridManager, 'flame_tower');

		const unitWorld = gridManager.gridToWorld(pos.gridX, pos.gridY + 1);
		const events = towerSystem.update(1000, 16, [
			{
				instanceId: 'u1',
				x: unitWorld.x,
				y: unitWorld.y,
				hp: 100,
				element: 'lightning',
			},
		]);

		const damageEvt = events.find((e) => e.unitId === 'u1' && e.damage > 0);
		expect(damageEvt).toBeDefined();
		// flame_tower damage=40, fire vs lightning=1.3x → 52
		expect(damageEvt?.damage).toBe(52);
	});

	it('slow tower parses correct factor: emp slow_30% → factor 0.7', () => {
		const { towerSystem, gridManager } = createTowerSystem();
		const pos = placeTowerAndGetWorld(towerSystem, gridManager, 'emp');

		const unitWorld = gridManager.gridToWorld(pos.gridX, pos.gridY + 1);
		const events = towerSystem.update(1000, 16, [
			{
				instanceId: 'u1',
				x: unitWorld.x,
				y: unitWorld.y,
				hp: 100,
				element: 'neutral',
			},
		]);

		const slowEvt = events.find((e) => e.slow);
		expect(slowEvt).toBeDefined();
		expect(slowEvt?.slow?.factor).toBe(0.7);
	});

	it('stun tower returns stun event via buffer (not callback)', () => {
		const { towerSystem, gridManager } = createTowerSystem();
		const pos = placeTowerAndGetWorld(towerSystem, gridManager, 'fortress');

		const unitWorld = gridManager.gridToWorld(pos.gridX, pos.gridY + 1);
		const events = towerSystem.update(1000, 16, [
			{
				instanceId: 'u1',
				x: unitWorld.x,
				y: unitWorld.y,
				hp: 100,
				element: 'neutral',
			},
		]);

		const stunEvt = events.find((e) => e.stun);
		expect(stunEvt).toBeDefined();
		expect(stunEvt?.stun?.duration).toBe(1000); // CC_AURA_CONFIGS.stun_aoe = 1000ms
	});

	it('active stun tower (fortress) duration scales with level (LV.50 → 1.4x)', () => {
		const { towerSystem, gridManager } = createTowerSystem([
			makeOwned('fortress', 50),
		]);
		const pos = placeTowerAndGetWorld(towerSystem, gridManager, 'fortress');
		const unitWorld = gridManager.gridToWorld(pos.gridX, pos.gridY + 1);

		const events = towerSystem.update(1000, 16, [
			{
				instanceId: 'u1',
				x: unitWorld.x,
				y: unitWorld.y,
				hp: 100,
				element: 'neutral',
			},
		]);

		// Active path: base stun_aoe durationMs=1000 * stunDurationMultiplier(50)=1.4 → 1400
		const stunEvt = events.find((e) => e.stun);
		expect(stunEvt).toBeDefined();
		expect(stunEvt?.stun?.duration).toBe(1400);
	});

	it('passive stun aura (shield) returns stun event on cooldown', () => {
		const { towerSystem, gridManager } = createTowerSystem();
		const pos = placeTowerAndGetWorld(towerSystem, gridManager, 'shield');

		const unitWorld = gridManager.gridToWorld(pos.gridX, pos.gridY + 1);

		// First call at time >= cooldown: lastAuraTime=0, cooldown check passes
		const events1 = towerSystem.update(3000, 16, [
			{
				instanceId: 'u1',
				x: unitWorld.x,
				y: unitWorld.y,
				hp: 100,
				element: 'neutral',
			},
		]);
		const stun1 = events1.find((e) => e.stun);
		expect(stun1).toBeDefined();
		expect(stun1?.stun?.duration).toBe(1000);

		// Second call before next cooldown: should NOT stun
		const events2 = towerSystem.update(4000, 16, [
			{
				instanceId: 'u1',
				x: unitWorld.x,
				y: unitWorld.y,
				hp: 100,
				element: 'neutral',
			},
		]);
		expect(events2.find((e) => e.stun)).toBeUndefined();

		// Third call after next cooldown (3000 + 3000 = 6000): should stun again
		const events3 = towerSystem.update(6001, 16, [
			{
				instanceId: 'u1',
				x: unitWorld.x,
				y: unitWorld.y,
				hp: 100,
				element: 'neutral',
			},
		]);
		expect(events3.find((e) => e.stun)).toBeDefined();
	});

	it('shield stun duration scales with tower level (LV.50 → 1.4x)', () => {
		const { towerSystem, gridManager } = createTowerSystem([
			makeOwned('shield', 50),
		]);
		const pos = placeTowerAndGetWorld(towerSystem, gridManager, 'shield');
		const unitWorld = gridManager.gridToWorld(pos.gridX, pos.gridY + 1);

		const events = towerSystem.update(3000, 16, [
			{
				instanceId: 'u1',
				x: unitWorld.x,
				y: unitWorld.y,
				hp: 100,
				element: 'neutral',
			},
		]);

		const stunEvt = events.find((e) => e.stun);
		expect(stunEvt).toBeDefined();
		// base durationMs=1000, stunDurationMultiplier(50)=1.4 → 1400
		expect(stunEvt?.stun?.duration).toBe(1400);
	});

	it('shield stun cooldown scales with tower level (LV.50 → 0.71x)', () => {
		const { towerSystem, gridManager } = createTowerSystem([
			makeOwned('shield', 50),
		]);
		const pos = placeTowerAndGetWorld(towerSystem, gridManager, 'shield');
		const unitWorld = gridManager.gridToWorld(pos.gridX, pos.gridY + 1);
		const unit = {
			instanceId: 'u1',
			x: unitWorld.x,
			y: unitWorld.y,
			hp: 100,
			element: 'neutral' as const,
		};

		// First aura fires at t=3000 (lastAuraTime=0, elapsed 3000 >= 2130)
		const events1 = towerSystem.update(3000, 16, [unit]);
		expect(events1.find((e) => e.stun)).toBeDefined();

		// At t=5000, elapsed 2000 < 2130 → no stun yet (would've fired at 3000*0.71 after)
		const events2 = towerSystem.update(5000, 16, [unit]);
		expect(events2.find((e) => e.stun)).toBeUndefined();

		// At t=5200, elapsed 2200 >= 2130 → fires. LV.1 would still be blocked (2200<3000)
		const events3 = towerSystem.update(5200, 16, [unit]);
		expect(events3.find((e) => e.stun)).toBeDefined();
	});

	it('disruptor slow_50%_splash applies both slow AND splash', () => {
		const { towerSystem, gridManager } = createTowerSystem();
		const pos = placeTowerAndGetWorld(towerSystem, gridManager, 'disruptor');

		const unitWorld1 = gridManager.gridToWorld(pos.gridX, pos.gridY + 1);
		const unitWorld2 = gridManager.gridToWorld(pos.gridX + 1, pos.gridY + 1);
		const units = [
			{
				instanceId: 'u1',
				x: unitWorld1.x,
				y: unitWorld1.y,
				hp: 100,
				element: 'neutral' as const,
			},
			{
				instanceId: 'u2',
				x: unitWorld2.x,
				y: unitWorld2.y,
				hp: 100,
				element: 'neutral' as const,
			},
		];
		towerSystem.update(1000, 16, units);
		// Drain projectile TTL
		const events = towerSystem.update(1000, 600, units);

		// Primary target gets slow
		const primarySlow = events.find((e) => e.unitId === 'u1' && e.slow);
		expect(primarySlow).toBeDefined();
		expect(primarySlow?.slow?.factor).toBe(0.5); // 50%

		// Splash target gets damage + slow
		const splashEvt = events.find((e) => e.unitId === 'u2' && e.damage > 0);
		expect(splashEvt).toBeDefined();
		expect(splashEvt?.slow).toBeDefined();
	});

	it('disruptor splash slow does NOT apply beyond tower range (#98)', () => {
		const { towerSystem, gridManager } = createTowerSystem();
		const pos = placeTowerAndGetWorld(towerSystem, gridManager, 'disruptor');

		// disruptor range=5 (rangeSq=25). Tower grid pos (gx,gy), unit centers are
		// floats (gx+0.5,gy+N.5). u1 at y+4 → distSq 20.5 (in range).
		// u2 at y+5 → distSq 30.5 (out of range) but 1.0 from u1 (within splash 2.25).
		const unitWorld1 = gridManager.gridToWorld(pos.gridX, pos.gridY + 4);
		const unitWorld2 = gridManager.gridToWorld(pos.gridX, pos.gridY + 5);
		const units = [
			{
				instanceId: 'u1',
				x: unitWorld1.x,
				y: unitWorld1.y,
				hp: 100,
				element: 'neutral' as const,
			},
			{
				instanceId: 'u2',
				x: unitWorld2.x,
				y: unitWorld2.y,
				hp: 100,
				element: 'neutral' as const,
			},
		];
		towerSystem.update(1000, 16, units);
		// Drain projectile TTL
		const events = towerSystem.update(1000, 600, units);

		// u1 in range → slowed + damaged
		const primary = events.find((e) => e.unitId === 'u1');
		expect(primary?.slow).toBeDefined();

		// u2 outside tower range → still takes splash damage but NO slow
		const splashEvt = events.find((e) => e.unitId === 'u2' && e.damage > 0);
		expect(splashEvt).toBeDefined();
		expect(splashEvt?.slow).toBeUndefined();
	});

	it('focused attacker (no special) sets armorPierce=true', () => {
		const { towerSystem, gridManager } = createTowerSystem();
		const pos = placeTowerAndGetWorld(towerSystem, gridManager, 'archer');

		const unitWorld = gridManager.gridToWorld(pos.gridX, pos.gridY + 1);
		const unit = {
			instanceId: 'u1',
			x: unitWorld.x,
			y: unitWorld.y,
			hp: 100,
			element: 'neutral' as const,
		};
		towerSystem.update(1000, 16, [unit]);
		// Second update drains projectile TTL → damage flush
		const events = towerSystem.update(1000, 600, [unit]);

		const damageEvt = events.find((e) => e.unitId === 'u1' && e.damage > 0);
		expect(damageEvt).toBeDefined();
		expect(damageEvt?.armorPierce).toBe(true);
	});

	it('splash tower (plasma) does NOT set armorPierce', () => {
		const { towerSystem, gridManager } = createTowerSystem();
		const pos = placeTowerAndGetWorld(towerSystem, gridManager, 'plasma');

		// plasma range=2, place unit on same tile to guarantee in-range
		// plasma attackSpeed=0.8 → interval 1250ms, need time > 1250
		const unitWorld = gridManager.gridToWorld(pos.gridX, pos.gridY);
		const unit = {
			instanceId: 'u1',
			x: unitWorld.x,
			y: unitWorld.y,
			hp: 100,
			element: 'neutral' as const,
		};
		towerSystem.update(2000, 16, [unit]);
		// Drain projectile TTL to flush pending damage
		const events = towerSystem.update(2000, 600, [unit]);

		const damageEvt = events.find((e) => e.unitId === 'u1' && e.damage > 0);
		expect(damageEvt).toBeDefined();
		expect(damageEvt?.armorPierce).toBe(false);
	});

	it('no boost system remains: update has no applyStun callback param', () => {
		const { towerSystem } = createTowerSystem();
		// update() takes 3 params (time, delta, unitPositions), not 4
		expect(towerSystem.update.length).toBeLessThanOrEqual(3);
	});

	it('archer tower produces arrow-style attack lines', () => {
		const { towerSystem, gridManager } = createTowerSystem();
		const pos = placeTowerAndGetWorld(towerSystem, gridManager, 'archer');
		const unitWorld = gridManager.gridToWorld(pos.gridX, pos.gridY + 1);

		towerSystem.update(2000, 16, [
			{
				instanceId: 'u1',
				x: unitWorld.x,
				y: unitWorld.y,
				hp: 100,
				element: 'neutral' as const,
			},
		]);

		const lines = (
			towerSystem as unknown as { attackLines: { style: string }[] }
		).attackLines;
		expect(lines.length).toBe(1);
		expect(lines[0].style).toBe('arrow');
	});
});
