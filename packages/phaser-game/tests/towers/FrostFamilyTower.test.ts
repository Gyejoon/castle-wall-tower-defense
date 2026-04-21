import { describe, expect, it, vi } from 'vitest';
import { FrostFamilyTower } from '../../src/towers/families/FrostFamilyTower';
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

function buildFrostTower(defId: string, special: string): FrostFamilyTower {
	const def = {
		id: defId,
		element: 'neutral',
		family: 'frost',
		color: '#ffffff',
		stats: {
			damage: 10,
			range: 3,
			attackSpeed: 1,
			projectileSpeed: 400,
			special,
		},
	} as never;
	const data = {
		instanceId: 't1',
		defId,
		// Tower grid (2, 2) → worldToGridFloat of unit at (100,100) is
		// (2.083, 2.083) for tile=48, so distSq ≈ 0.014 < 3*3 = 9. In range.
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
	return new FrostFamilyTower(deps);
}

describe('FrostFamilyTower', () => {
	it('emp: pushes damage + slow=0.7 factor (2 events)', () => {
		const ctx = buildCtx();
		const tower = buildFrostTower('emp', 'slow_30%');
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
		expect(pushed[0][0].slow).toBeUndefined();
		// Slow event — damage=0, slow factor 0.7, 2000ms.
		expect(pushed[1][0]).toEqual(
			expect.objectContaining({
				unitId: 'u1',
				damage: 0,
			}),
		);
		expect(pushed[1][0].slow.factor).toBeCloseTo(0.7, 3);
		expect(pushed[1][0].slow.duration).toBe(2000);
	});

	it('emits a beam attack-line (style=beam, no impactPending)', () => {
		const ctx = buildCtx();
		const tower = buildFrostTower('emp', 'slow_30%');
		tower.update(ctx);
		const spy = ctx.vfx.pushAttackLine as unknown as ReturnType<typeof vi.fn>;
		expect(spy).toHaveBeenCalledTimes(1);
		const line = spy.mock.calls[0][0];
		expect(line.style).toBe('beam');
		expect(line.impactPending).toBeUndefined();
	});

	// Parameterized: all 4 defIds map `slow_XX%` → (1 - XX/100).
	it.each([
		{ defId: 'emp', special: 'slow_30%', factor: 0.7 },
		{ defId: 'stasis_field', special: 'slow_45%', factor: 0.55 },
		{ defId: 'disruptor', special: 'slow_60%', factor: 0.4 },
		{ defId: 'world_tree', special: 'slow_75%', factor: 0.25 },
	])(
		'$defId: parses $special → slow factor $factor',
		({ defId, special, factor }) => {
			const ctx = buildCtx();
			const tower = buildFrostTower(defId, special);
			tower.update(ctx);
			const pushed = (ctx.pushDamage as ReturnType<typeof vi.fn>).mock.calls;
			expect(pushed).toHaveLength(2);
			expect(pushed[1][0].slow.factor).toBeCloseTo(factor, 3);
			expect(pushed[1][0].slow.duration).toBe(2000);
			// Damage event stays consistent across defIds — armorPierce=false
			// because `special` is set.
			expect(pushed[0][0].armorPierce).toBe(false);
		},
	);

	it('honors attackSpeed cooldown (fires once per interval)', () => {
		const tower = buildFrostTower('emp', 'slow_30%');
		const base = buildCtx({ time: 5000 });
		tower.update(base);
		const spy =
			base.vfx.pushAttackLine as unknown as ReturnType<typeof vi.fn>;
		expect(spy).toHaveBeenCalledTimes(1);
		tower.update({ ...base, time: 5500 });
		expect(spy).toHaveBeenCalledTimes(1); // under 1000ms cooldown
		tower.update({ ...base, time: 6001 });
		expect(spy).toHaveBeenCalledTimes(2);
	});
});
