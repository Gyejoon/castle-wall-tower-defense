import { describe, expect, it, vi } from 'vitest';
import { StunFamilyTower } from '../../src/towers/families/StunFamilyTower';
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
		effectiveDamage: 10,
		primaryTarget: null,
		pushDamage,
		vfx: {
			pushAttackLine,
			acquireArrow: vi.fn().mockReturnValueOnce(7).mockReturnValueOnce(8),
			spawnMuzzleVfx: vi.fn(),
			spawnImpactVfx: vi.fn(),
			playTowerAttackThrottled: vi.fn(),
			destroy: vi.fn(),
		} as never,
		resolveDamage: () => 10,
		...overrides,
	};
}

function buildStunTower(
	defId: string,
	special: string,
	color = '#ffffff',
	projectileSpeed: number | undefined = 400,
): StunFamilyTower {
	const def = {
		id: defId,
		element: 'neutral',
		family: 'stun',
		color,
		stats: {
			damage: 10,
			range: 3,
			attackSpeed: 1,
			projectileSpeed,
			special,
		},
	} as never;
	const data = {
		instanceId: 't1',
		defId,
		// Tower grid (2, 2) → unit at (100,100) via faithful
		// worldToGridFloat = (2.083, 2.083) → distSq ≈ 0.014 < 9 (range 3²).
		position: { x: 2, y: 2 },
		level: 1,
	} as never;
	const sprite = {
		x: 120,
		y: 120,
		active: true,
		setVisible: vi.fn(),
	} as never;
	const deps: TowerConstructorDeps = {
		def,
		data,
		scene: {} as never,
		gridManager: {} as never,
		vfx: {} as never,
		level: 1,
		sprite,
	};
	return new StunFamilyTower(deps);
}

describe('StunFamilyTower', () => {
	describe('beam path (shield / holy_shrine / divine_throne)', () => {
		it('shield: pushes two DamageEvents per fire (damage + stun)', () => {
			const ctx = buildCtx();
			const tower = buildStunTower('shield', 'stun_300ms');
			tower.update(ctx);

			const pushed = (ctx.pushDamage as ReturnType<typeof vi.fn>).mock.calls;
			expect(pushed).toHaveLength(2);
			// Damage event — special is set, so armorPierce is false.
			expect(pushed[0][0]).toEqual(
				expect.objectContaining({
					unitId: 'u1',
					damage: 10,
					armorPierce: false,
				}),
			);
			expect(pushed[0][0].stun).toBeUndefined();
			// Stun event — damage=0, duration=1000ms (CC_AURA_CONFIGS miss →
			// fallback × stunDurationMultiplier(1) = 1.0).
			expect(pushed[1][0]).toEqual(
				expect.objectContaining({
					unitId: 'u1',
					damage: 0,
				}),
			);
			expect(pushed[1][0].stun.duration).toBe(1000);
		});

		it('emits a beam attack-line (style=beam, no impactPending)', () => {
			const ctx = buildCtx();
			const tower = buildStunTower('shield', 'stun_300ms');
			tower.update(ctx);
			const spy = ctx.vfx.pushAttackLine as unknown as ReturnType<typeof vi.fn>;
			expect(spy).toHaveBeenCalledTimes(1);
			const line = spy.mock.calls[0][0];
			expect(line.style).toBe('beam');
			expect(line.impactPending).toBeUndefined();
		});

		it('divine_throne: stun fires with 1000ms duration at level 1', () => {
			const ctx = buildCtx();
			const tower = buildStunTower('divine_throne', 'stun_1200ms');
			tower.update(ctx);
			const pushed = (ctx.pushDamage as ReturnType<typeof vi.fn>).mock.calls;
			expect(pushed).toHaveLength(2);
			// `stun_1200ms` → CC_AURA_CONFIGS miss → fallback 1000ms. The
			// `_XXXms` suffix is vestigial; legacy never parses it.
			expect(pushed[1][0].stun.duration).toBe(1000);
		});
	});

	describe('twin_archer (multi-shot arrow path)', () => {
		it('does NOT push damage via ctx.pushDamage (deferred to impact)', () => {
			const ctx = buildCtx();
			const tower = buildStunTower('twin_archer', 'stun_500ms');
			tower.update(ctx);
			expect(ctx.pushDamage).not.toHaveBeenCalled();
		});

		it('fires 2 arrow attack-lines sharing the same pendingDamage batch', () => {
			const ctx = buildCtx();
			const tower = buildStunTower('twin_archer', 'stun_500ms');
			tower.update(ctx);

			const spy = ctx.vfx.pushAttackLine as unknown as ReturnType<typeof vi.fn>;
			expect(spy).toHaveBeenCalledTimes(2);
			const lineA = spy.mock.calls[0][0];
			const lineB = spy.mock.calls[1][0];

			expect(lineA.style).toBe('arrow');
			expect(lineB.style).toBe('arrow');
			expect(lineA.towerType).toBe('twin_archer');
			expect(lineB.towerType).toBe('twin_archer');
			expect(lineA.impactPending).toBe(true);
			expect(lineB.impactPending).toBe(true);

			// Shared batch: halved damage (10/2 = 5) + full-duration stun (1000ms).
			expect(lineA.pendingDamage).toHaveLength(2);
			expect(lineA.pendingDamage[0]).toEqual(
				expect.objectContaining({
					unitId: 'u1',
					damage: 5,
					armorPierce: false,
				}),
			);
			expect(lineA.pendingDamage[1]).toEqual(
				expect.objectContaining({ unitId: 'u1', damage: 0 }),
			);
			expect(lineA.pendingDamage[1].stun.duration).toBe(1000);
			// Both lines share the same batch array (legacy applies stun twice;
			// UnitSystem.applyStun uses Math.max → effective 1× duration).
			expect(lineB.pendingDamage).toBe(lineA.pendingDamage);
		});

		it('shot 0 has ttl=baseMaxTtl; shot 1 has ttl=baseMaxTtl+80', () => {
			const ctx = buildCtx();
			const tower = buildStunTower('twin_archer', 'stun_500ms');
			tower.update(ctx);

			const spy = ctx.vfx.pushAttackLine as unknown as ReturnType<typeof vi.fn>;
			const lineA = spy.mock.calls[0][0];
			const lineB = spy.mock.calls[1][0];
			expect(lineB.ttl).toBe(lineA.ttl + 80);
			expect(lineB.maxTtl).toBe(lineA.maxTtl + 80);
		});

		it('shot 0 offsetY = -4; shot 1 offsetY = +4 (y2 difference)', () => {
			const ctx = buildCtx();
			const tower = buildStunTower('twin_archer', 'stun_500ms');
			tower.update(ctx);

			const spy = ctx.vfx.pushAttackLine as unknown as ReturnType<typeof vi.fn>;
			const lineA = spy.mock.calls[0][0];
			const lineB = spy.mock.calls[1][0];
			// y1/y2 both shifted by the same offsetY per shot.
			expect(lineA.y2).toBe(100 - 4);
			expect(lineB.y2).toBe(100 + 4);
			expect(lineB.y1 - lineA.y1).toBe(8);
		});
	});
});
