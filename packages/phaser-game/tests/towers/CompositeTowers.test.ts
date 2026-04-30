import { describe, expect, it, vi } from 'vitest';
import { FrostFamilyTower } from '../../src/towers/families/FrostFamilyTower';
import { SiegeFamilyTower } from '../../src/towers/families/SiegeFamilyTower';
// Side-effect import: registers hybrid_ab / hybrid_cd / ultimate into
// the tower registry so `createTower` resolves them.
import '../../src/towers/instances/composite';
import { createTower } from '../../src/towers/registry';
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
			hasPlacementAnchors: () => false,
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

function buildDeps(
	defId: string,
	special: string,
	opts: {
		range?: number;
		attackSpeed?: number;
		damage?: number;
		projectileSpeed?: number;
		family?: string;
	} = {},
): TowerConstructorDeps {
	const def = {
		id: defId,
		element: 'neutral',
		family: opts.family ?? 'hybrid',
		color: '#ffffff',
		stats: {
			damage: opts.damage ?? 30,
			range: opts.range ?? 6,
			attackSpeed: opts.attackSpeed ?? 1,
			projectileSpeed: opts.projectileSpeed,
			special,
		},
	} as never;
	const data = {
		instanceId: 't1',
		defId,
		// Tower grid (2, 2) → worldToGridFloat of unit at (100,100) is
		// (2.083, 2.083) for tile=48; distSq ≈ 0.014 < range² for all
		// composites (ranges ≥ 5.5).
		position: { x: 2, y: 2 },
		level: 1,
	} as never;
	const sprite = {
		x: 120,
		y: 120,
		active: true,
		setVisible: vi.fn(),
	} as never;
	return {
		def,
		data,
		scene: {} as never,
		gridManager: {} as never,
		vfx: {} as never,
		level: 1,
		sprite,
	};
}

describe('Composite T5/T6 towers', () => {
	describe('hybrid_ab (T5 splash_1.6)', () => {
		it('routes to SiegeFamilyTower via registry', () => {
			const deps = buildDeps('hybrid_ab', 'splash_1.6', {
				range: 6,
				attackSpeed: 1.4,
				damage: 200,
				projectileSpeed: 6,
			});
			const tower = createTower('hybrid_ab', deps);
			expect(tower).toBeInstanceOf(SiegeFamilyTower);
		});

		it('emits arc attack-line with main + splash pendingDamage (no CC)', () => {
			// u1 at (100,100) = grid (2.083, 2.083) — primary target.
			// u2 at (148,100) = grid (3.083, 2.083) → dsq=1.0 < 2.25 → in splash.
			// u3 at (244,100) = grid (5.083, 2.083) → dsq=9.0 > 2.25 → outside.
			const units: UnitSnapshot[] = [
				buildUnit({ instanceId: 'u1', x: 100, y: 100 }),
				buildUnit({ instanceId: 'u2', x: 148, y: 100 }),
				buildUnit({ instanceId: 'u3', x: 244, y: 100 }),
			];
			const ctx = buildCtx({ units });
			const deps = buildDeps('hybrid_ab', 'splash_1.6', {
				range: 6,
				attackSpeed: 1.4,
				damage: 200,
				projectileSpeed: 6,
			});
			const tower = createTower('hybrid_ab', deps);
			expect(tower).not.toBeNull();
			tower!.update(ctx);

			const spy = ctx.vfx.pushAttackLine as unknown as ReturnType<typeof vi.fn>;
			expect(spy).toHaveBeenCalledTimes(1);
			const line = spy.mock.calls[0][0];
			expect(line.style).toBe('arc');
			expect(line.towerType).toBe('hybrid_ab');
			expect(line.impactPending).toBe(true);
			expect(line.impactVfxKey).toBe('vfx-explosion-sm');

			// pendingDamage: main (u1, 30, armorPierce=false — special set)
			// + splash (u2, 10 via resolveSplashDamage). u3 outside radius.
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

			// No slow/stun events on pendingDamage.
			for (const p of line.pendingDamage) {
				expect(p.slow).toBeUndefined();
				expect(p.stun).toBeUndefined();
			}
			// No ctx.pushDamage calls (arc defers all damage to impact).
			expect(ctx.pushDamage).not.toHaveBeenCalled();
		});
	});

	describe('hybrid_cd (T5 slow_80%_stun_600ms)', () => {
		it('routes to FrostFamilyTower via registry', () => {
			const deps = buildDeps('hybrid_cd', 'slow_80%_stun_600ms', {
				range: 5.5,
				attackSpeed: 1.2,
				damage: 80,
			});
			const tower = createTower('hybrid_cd', deps);
			expect(tower).toBeInstanceOf(FrostFamilyTower);
		});

		it('pushes damage + slow events (factor=0.2, no stun)', () => {
			const ctx = buildCtx();
			const deps = buildDeps('hybrid_cd', 'slow_80%_stun_600ms', {
				range: 5.5,
				attackSpeed: 1.2,
				damage: 80,
				family: 'hybrid',
			});
			const tower = createTower('hybrid_cd', deps);
			expect(tower).not.toBeNull();
			tower!.update(ctx);

			const pushed = (ctx.pushDamage as ReturnType<typeof vi.fn>).mock.calls;
			expect(pushed).toHaveLength(2);

			// [0] main damage event (resolveDamage → 30, armorPierce=false).
			expect(pushed[0][0]).toEqual(
				expect.objectContaining({
					unitId: 'u1',
					damage: 30,
					armorPierce: false,
				}),
			);
			expect(pushed[0][0].slow).toBeUndefined();
			expect(pushed[0][0].stun).toBeUndefined();

			// [1] slow event: damage=0, factor = 1 - 80/100 = 0.2, 2000ms.
			expect(pushed[1][0]).toEqual(
				expect.objectContaining({ unitId: 'u1', damage: 0 }),
			);
			expect(pushed[1][0].slow.factor).toBeCloseTo(0.2, 3);
			expect(pushed[1][0].slow.duration).toBe(2000);
			// No stun on the slow event either — legacy parity: the
			// `_stun_600ms` suffix is vestigial because `isStunSpecial`
			// requires the string to START with `stun`.
			expect(pushed[1][0].stun).toBeUndefined();
		});

		it('emits a beam attack-line (style=beam, no impactPending)', () => {
			const ctx = buildCtx();
			const deps = buildDeps('hybrid_cd', 'slow_80%_stun_600ms', {
				range: 5.5,
				attackSpeed: 1.2,
				damage: 80,
			});
			const tower = createTower('hybrid_cd', deps);
			tower!.update(ctx);

			const spy = ctx.vfx.pushAttackLine as unknown as ReturnType<typeof vi.fn>;
			expect(spy).toHaveBeenCalledTimes(1);
			const line = spy.mock.calls[0][0];
			expect(line.style).toBe('beam');
			expect(line.impactPending).toBeUndefined();
			// Beam path does not populate pendingDamage.
			expect(line.pendingDamage).toBeUndefined();
		});
	});

	describe('ultimate (T6 splash_2.5_slow_90%_stun_1500ms)', () => {
		it('routes to SiegeFamilyTower via registry', () => {
			const deps = buildDeps('ultimate', 'splash_2.5_slow_90%_stun_1500ms', {
				range: 7,
				attackSpeed: 1.6,
				damage: 500,
				family: 'ultimate',
			});
			const tower = createTower('ultimate', deps);
			expect(tower).toBeInstanceOf(SiegeFamilyTower);
		});

		it('emits arc attack-line with splash only — slow/stun suffixes ignored', () => {
			// Same splash geometry as hybrid_ab: u1 primary, u2 in splash, u3 out.
			const units: UnitSnapshot[] = [
				buildUnit({ instanceId: 'u1', x: 100, y: 100 }),
				buildUnit({ instanceId: 'u2', x: 148, y: 100 }),
				buildUnit({ instanceId: 'u3', x: 244, y: 100 }),
			];
			const ctx = buildCtx({ units });
			const deps = buildDeps('ultimate', 'splash_2.5_slow_90%_stun_1500ms', {
				range: 7,
				attackSpeed: 1.6,
				damage: 500,
				family: 'ultimate',
			});
			const tower = createTower('ultimate', deps);
			expect(tower).not.toBeNull();
			tower!.update(ctx);

			const spy = ctx.vfx.pushAttackLine as unknown as ReturnType<typeof vi.fn>;
			expect(spy).toHaveBeenCalledTimes(1);
			const line = spy.mock.calls[0][0];
			expect(line.style).toBe('arc');
			expect(line.towerType).toBe('ultimate');
			expect(line.impactPending).toBe(true);

			// pendingDamage: main (u1, 30) + splash (u2, 10). u3 outside.
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

			// Legacy parity: despite `_slow_90%_stun_1500ms` in the special,
			// no slow or stun events fire because `isSlowSpecial`/
			// `isStunSpecial` only match when `special` STARTS WITH their
			// keyword — this string starts with `splash`.
			for (const p of line.pendingDamage) {
				expect(p.slow).toBeUndefined();
				expect(p.stun).toBeUndefined();
			}
			expect(ctx.pushDamage).not.toHaveBeenCalled();
		});
	});
});
