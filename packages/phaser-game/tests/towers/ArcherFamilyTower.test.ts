import { describe, expect, it, vi } from 'vitest';
import { ArcherFamilyTower } from '../../src/towers/families/ArcherFamilyTower';
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
			worldToGridFloat: () => ({ x: 5, y: 5 }),
			worldToGrid: () => ({ x: 5, y: 5 }),
			gridToWorld: (gx: number, gy: number) => ({
				x: gx * 48 + 24,
				y: gy * 48 + 24,
			}),
			orthoTile: 48,
			getDepth: () => 10,
		} as never,
		effectiveDamage: 10,
		primaryTarget: null,
		pushDamage,
		vfx: {
			pushAttackLine,
			acquireArrow: () => 0,
			spawnMuzzleVfx: vi.fn(),
			spawnImpactVfx: vi.fn(),
			playTowerAttackThrottled: vi.fn(),
			destroy: vi.fn(),
		} as never,
		resolveDamage: () => 10,
		...overrides,
	};
}

function buildArcherTower(defId: string): ArcherFamilyTower {
	const def = {
		id: defId,
		element: 'neutral',
		family: 'archer',
		color: '#ffffff',
		stats: {
			damage: 10,
			range: 3,
			attackSpeed: 1,
			projectileSpeed: 400,
			special: undefined,
		},
	} as never;
	const data = {
		instanceId: 't1',
		defId,
		position: { x: 5, y: 5 },
		level: 1,
	} as never;
	const sprite = {
		x: 240,
		y: 240,
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
	return new ArcherFamilyTower(deps);
}

describe('ArcherFamilyTower', () => {
	describe('archer (arrow projectile)', () => {
		it('defers damage to projectile pendingDamage (not pushDamage)', () => {
			const ctx = buildCtx();
			const tower = buildArcherTower('archer');
			tower.update(ctx);
			expect(ctx.pushDamage).not.toHaveBeenCalled();
			const pushSpy =
				ctx.vfx.pushAttackLine as unknown as ReturnType<typeof vi.fn>;
			expect(pushSpy).toHaveBeenCalled();
			const line = pushSpy.mock.calls[0][0];
			expect(line.style).toBe('arrow');
			expect(line.impactPending).toBe(true);
			expect(line.pendingDamage).toEqual([
				expect.objectContaining({
					unitId: 'u1',
					damage: 10,
					armorPierce: true,
				}),
			]);
		});

		it('honors attackSpeed cooldown (fires once per interval)', () => {
			const tower = buildArcherTower('archer');
			const base = buildCtx({ time: 5000 });
			tower.update(base);
			const spy =
				base.vfx.pushAttackLine as unknown as ReturnType<typeof vi.fn>;
			expect(spy).toHaveBeenCalledTimes(1);
			// Same vfx handle reused across updates so mock call counts
			// accumulate — only the time changes.
			tower.update({ ...base, time: 5500 });
			expect(spy).toHaveBeenCalledTimes(1); // under 1000ms cooldown
			tower.update({ ...base, time: 6001 });
			expect(spy).toHaveBeenCalledTimes(2);
		});
	});

	describe('wind_spire (beam)', () => {
		it('pushes immediate damage via ctx.pushDamage and emits beam line', () => {
			const ctx = buildCtx();
			const tower = buildArcherTower('wind_spire');
			tower.update(ctx);
			expect(ctx.pushDamage).toHaveBeenCalledWith(
				expect.objectContaining({
					unitId: 'u1',
					damage: 10,
					armorPierce: true,
				}),
			);
			const spy =
				ctx.vfx.pushAttackLine as unknown as ReturnType<typeof vi.fn>;
			expect(spy.mock.calls[0][0].style).toBe('beam');
			expect(spy.mock.calls[0][0].impactPending).toBeUndefined();
		});
	});
});
