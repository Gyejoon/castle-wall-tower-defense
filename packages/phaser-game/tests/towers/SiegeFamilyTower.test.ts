import { describe, expect, it, vi } from 'vitest';
import { SiegeFamilyTower } from '../../src/towers/families/SiegeFamilyTower';
import { NovaCannonT1 } from '../../src/towers/instances/NovaCannonT1';
import type {
	AttackContext,
	TowerConstructorDeps,
	UnitSnapshot,
} from '../../src/towers/types';

function buildUnit(overrides: Partial<UnitSnapshot> = {}): UnitSnapshot {
	return {
		instanceId: 'u1',
		x: 100,
		y: 100,
		hp: 50,
		element: 'neutral',
		...overrides,
	};
}

function buildCtx(overrides: Partial<AttackContext> = {}): AttackContext {
	const pushDamage = vi.fn();
	const pushAttackLine = vi.fn();
	return {
		time: 5000,
		delta: 16,
		units: [buildUnit()],
		gridManager: {
			// Faithful: matches real math (no half-tile offset on float path).
			worldToGridFloat: (x: number, y: number) => ({ x: x / 48, y: y / 48 }),
			worldToGrid: (x: number, y: number) => ({
				x: Math.floor(x / 48),
				y: Math.floor(y / 48),
			}),
			gridToWorld: (gx: number, gy: number) => ({
				x: (gx + 0.5) * 48,
				y: (gy + 0.5) * 48,
			}),
			orthoTile: 48,
			getDepth: () => 10,
		} as never,
		effectiveDamage: 30,
		primaryTarget: null,
		pushDamage,
		vfx: {
			pushAttackLine,
			acquireArrow: vi.fn(),
			spawnMuzzleVfx: vi.fn(),
			spawnImpactVfx: vi.fn(),
			playTowerAttackThrottled: vi.fn(),
			destroy: vi.fn(),
		} as never,
		resolveDamage: (target: UnitSnapshot) =>
			target.instanceId === 'u1' ? 30 : 20,
		resolveSplashDamage: (target: UnitSnapshot) =>
			target.instanceId === 'u1' ? 15 : 10,
		...overrides,
	};
}

function buildSiegeTower(
	defId: string,
	special: string,
	color = '#ffffff',
	projectileSpeed: number | undefined = 3,
	opts: { withBarrel?: boolean } = {},
): SiegeFamilyTower | NovaCannonT1 {
	const def = {
		id: defId,
		element: 'neutral',
		family: 'siege',
		color,
		stats: {
			damage: 30,
			range: 4,
			attackSpeed: 1,
			projectileSpeed,
			special,
		},
	} as never;
	const data = {
		instanceId: 't1',
		defId,
		// Tower grid (2, 2) → unit at (100,100) via faithful
		// worldToGridFloat = (2.083, 2.083) → distSq ≈ 0.014 < 16 (range 4²).
		position: { x: 2, y: 2 },
		level: 1,
	} as never;
	const sprite = {
		x: 120,
		y: 120,
		active: true,
		setVisible: vi.fn(),
	} as never;
	const barrelSprite = opts.withBarrel
		? ({ x: 200, y: 150, rotation: 0 } as never)
		: undefined;
	const deps: TowerConstructorDeps = {
		def,
		data,
		scene: {} as never,
		gridManager: {} as never,
		vfx: {} as never,
		level: 1,
		sprite,
		barrelSprite,
	};
	if (defId === 'nova_cannon') {
		return new NovaCannonT1(deps);
	}
	return new SiegeFamilyTower(deps);
}

describe('SiegeFamilyTower', () => {
	describe('fortress (arc path, default siege)', () => {
		it('emits an arc attack-line with main + splash pendingDamage', () => {
			// Primary target at (100, 100) = grid (2.083, 2.083).
			// Splash radius sq = 2.25. Put a second unit at (148, 100) =
			// grid (3.083, 2.083) → dsq = 1.0 < 2.25 (inside splash).
			// Third unit at (244, 100) = grid (5.083, 2.083) → dsq = 9.0 >
			// 2.25 (outside splash).
			const units: UnitSnapshot[] = [
				buildUnit({ instanceId: 'u1', x: 100, y: 100 }),
				buildUnit({ instanceId: 'u2', x: 148, y: 100 }),
				buildUnit({ instanceId: 'u3', x: 244, y: 100 }),
			];
			const ctx = buildCtx({ units });
			const tower = buildSiegeTower('fortress', 'splash_1.5');
			tower.update(ctx);

			const spy = ctx.vfx.pushAttackLine as unknown as ReturnType<typeof vi.fn>;
			expect(spy).toHaveBeenCalledTimes(1);
			const line = spy.mock.calls[0][0];
			expect(line.style).toBe('arc');
			expect(line.towerType).toBe('fortress');
			expect(line.impactPending).toBe(true);
			expect(line.impactVfxKey).toBe('vfx-explosion-sm');

			// pendingDamage: main (u1, 30, armorPierce=false because splash
			// special is set) + splash (u2, 15). u3 excluded (outside
			// SPLASH_RADIUS_SQ = 2.25).
			expect(line.pendingDamage).toHaveLength(2);
			expect(line.pendingDamage[0]).toEqual(
				expect.objectContaining({
					unitId: 'u1',
					damage: 30,
					armorPierce: false,
				}),
			);
			expect(line.pendingDamage[1]).toEqual(
				expect.objectContaining({ unitId: 'u2', damage: 10 }),
			);
		});

		it('does NOT push damage via ctx.pushDamage (deferred to impact)', () => {
			const ctx = buildCtx();
			const tower = buildSiegeTower('fortress', 'splash_1.5');
			tower.update(ctx);
			expect(ctx.pushDamage).not.toHaveBeenCalled();
		});

		it('spawns animated muzzle VFX (not hit-flash)', () => {
			const ctx = buildCtx();
			const tower = buildSiegeTower('fortress', 'splash_1.5');
			tower.update(ctx);
			expect(ctx.vfx.spawnMuzzleVfx).toHaveBeenCalledTimes(1);
			expect(ctx.vfx.spawnImpactVfx).not.toHaveBeenCalled();
		});
	});

	describe('celestial (T4 siege)', () => {
		it('emits an arc attack-line with main + splash pendingDamage', () => {
			const ctx = buildCtx();
			const tower = buildSiegeTower('celestial', 'splash_2.2');
			tower.update(ctx);

			const spy = ctx.vfx.pushAttackLine as unknown as ReturnType<typeof vi.fn>;
			expect(spy).toHaveBeenCalledTimes(1);
			const line = spy.mock.calls[0][0];
			expect(line.style).toBe('arc');
			expect(line.towerType).toBe('celestial');
			expect(line.impactPending).toBe(true);
			expect(line.pendingDamage).toHaveLength(1);
			expect(line.pendingDamage[0]).toEqual(
				expect.objectContaining({
					unitId: 'u1',
					damage: 30,
					armorPierce: false,
				}),
			);
		});
	});

	describe('earth_golem (arc style via hasSplash, redundant id branch gone)', () => {
		it('still emits arc style (splash_1.8 triggers arc branch)', () => {
			const ctx = buildCtx();
			const tower = buildSiegeTower('earth_golem', 'splash_1.8');
			tower.update(ctx);

			const spy = ctx.vfx.pushAttackLine as unknown as ReturnType<typeof vi.fn>;
			expect(spy).toHaveBeenCalledTimes(1);
			const line = spy.mock.calls[0][0];
			expect(line.style).toBe('arc');
			expect(line.towerType).toBe('earth_golem');
			expect(line.impactPending).toBe(true);
		});
	});

	describe('nova_cannon (barrel-tip fireOrigin + hit-flash muzzle)', () => {
		it('fires arc projectile from barrel tip (barrel.x + cos(rot)*10)', () => {
			// Tower at grid (2, 2) → world (120, 120). Unit at (200, 120):
			// directly east → barrel rotation = atan2(0, 80) = 0.
			// barrelSprite at (200, 150, rotation=0) → fireOrigin
			// = (200 + cos(0)*10, 150 + sin(0)*10) = (210, 150).
			const unit = buildUnit({ instanceId: 'u1', x: 200, y: 120 });
			const ctx = buildCtx({ units: [unit] });
			const tower = buildSiegeTower('nova_cannon', 'splash_1.2', '#ffffff', 3, {
				withBarrel: true,
			});
			tower.update(ctx);

			const spy = ctx.vfx.pushAttackLine as unknown as ReturnType<typeof vi.fn>;
			expect(spy).toHaveBeenCalledTimes(1);
			const line = spy.mock.calls[0][0];
			expect(line.style).toBe('arc');
			expect(line.towerType).toBe('nova_cannon');
			expect(line.x1).toBeCloseTo(210);
			expect(line.y1).toBeCloseTo(150);
		});

		it('spawns hit-flash impact VFX at barrel tip (NOT muzzle spritesheet)', () => {
			// Same setup as previous test: unit due east → rotation = 0
			// → fireOrigin = (210, 150).
			const unit = buildUnit({ instanceId: 'u1', x: 200, y: 120 });
			const ctx = buildCtx({ units: [unit] });
			const tower = buildSiegeTower('nova_cannon', 'splash_1.2', '#ffffff', 3, {
				withBarrel: true,
			});
			tower.update(ctx);

			expect(ctx.vfx.spawnImpactVfx).toHaveBeenCalledWith(
				'projectile-hit-flash',
				expect.closeTo(210),
				expect.closeTo(150),
			);
			expect(ctx.vfx.spawnMuzzleVfx).not.toHaveBeenCalled();
		});

		it('barrel rotation tracks nearest enemy every frame (regardless of cooldown)', () => {
			const barrel = { x: 200, y: 150, rotation: 0 } as never;
			const def = {
				id: 'nova_cannon',
				element: 'neutral',
				family: 'siege',
				color: '#ffffff',
				stats: {
					damage: 30,
					range: 4,
					attackSpeed: 1,
					projectileSpeed: 3,
					special: 'splash_1.2',
				},
			} as never;
			const data = {
				instanceId: 't1',
				defId: 'nova_cannon',
				position: { x: 2, y: 2 },
				level: 1,
			} as never;
			const sprite = { x: 120, y: 120, active: true } as never;
			const tower = new NovaCannonT1({
				def,
				data,
				scene: {} as never,
				gridManager: {} as never,
				vfx: {} as never,
				level: 1,
				sprite,
				barrelSprite: barrel,
			});

			// Tower world (from gridToWorld(2, 2)) = (120, 120).
			// Unit at (200, 120) → atan2(0, 80) = 0.
			const ctx = buildCtx({
				time: 1,
				units: [buildUnit({ instanceId: 'u1', x: 200, y: 120, hp: 50 })],
			});
			// Disable firing to isolate rotation: it should still update.
			tower.disable(1_000_000);
			tower.update(ctx);
			expect(barrel.rotation).toBeCloseTo(0);

			// Now change the unit to be directly south → atan2(80, 0) = π/2.
			const ctx2 = buildCtx({
				time: 2,
				units: [buildUnit({ instanceId: 'u1', x: 120, y: 200, hp: 50 })],
			});
			tower.update(ctx2);
			expect(barrel.rotation).toBeCloseTo(Math.PI / 2);

			// Fire cadence is blocked by disable(), so no attack-line emitted.
			const spy = ctx2.vfx.pushAttackLine as unknown as ReturnType<
				typeof vi.fn
			>;
			expect(spy).not.toHaveBeenCalled();
		});
	});
});
