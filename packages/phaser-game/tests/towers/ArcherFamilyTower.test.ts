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
			const pushSpy = ctx.vfx.pushAttackLine as unknown as ReturnType<
				typeof vi.fn
			>;
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
			const spy = base.vfx.pushAttackLine as unknown as ReturnType<
				typeof vi.fn
			>;
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
			const spy = ctx.vfx.pushAttackLine as unknown as ReturnType<typeof vi.fn>;
			expect(spy.mock.calls[0][0].style).toBe('beam');
			expect(spy.mock.calls[0][0].impactPending).toBeUndefined();
		});
	});

	// 타게팅은 반드시 data.position 기준이어야 한다. sprite.x/y에는 PLATFORM_LIFT 오프셋이 있고
	// gridToWorld(+t/2)와 worldToGridFloat(순수 /t)가 비대칭이라 sprite 경로는 +0.5x/-0.32y 만큼 어긋난다.
	describe('targeting parity (real GridManager round-trip)', () => {
		// 실제 GridManager와 동일 구현. 두 함수를 대칭화하면 이 테스트 자체가 의미를 잃는다.
		function realGridManager() {
			return {
				orthoTile: 48,
				getDepth: () => 10,
				gridToWorld: (gx: number, gy: number) => ({
					x: (gx + 0.5) * 48,
					y: (gy + 0.5) * 48,
				}),
				worldToGrid: (x: number, y: number) => ({
					x: Math.floor(x / 48),
					y: Math.floor(y / 48),
				}),
				worldToGridFloat: (x: number, y: number) => ({
					x: x / 48,
					y: y / 48,
				}),
			};
		}

		function buildTowerWithOffsetSprite(
			defId: string,
			dataPosition: { x: number; y: number },
			spriteXY: { x: number; y: number },
		): ArcherFamilyTower {
			const def = {
				id: defId,
				element: 'neutral',
				family: 'archer',
				color: '#ffffff',
				stats: {
					damage: 10,
					range: 2,
					attackSpeed: 1,
					projectileSpeed: 400,
					special: undefined,
				},
			} as never;
			const data = {
				instanceId: 't-parity',
				defId,
				position: dataPosition,
				level: 1,
			} as never;
			const sprite = {
				x: spriteXY.x,
				y: spriteXY.y,
				active: true,
				setVisible: vi.fn(),
			} as never;
			return new ArcherFamilyTower({
				def,
				data,
				scene: {} as never,
				gridManager: {} as never,
				vfx: {} as never,
				level: 1,
				sprite,
			});
		}

		it('picks nearest unit off data.position, not sprite-derived grid', () => {
			const gm = realGridManager();
			// Tower grid (5,5) → world center (264, 264). In production
			// TowerSystem.placeTower places the sprite at
			// (worldPos.x, worldPos.y - PLATFORM_LIFT*tile - 20) — that's
			// (264, 224.8) for tile=48 and PLATFORM_LIFT=0.4. The faithful
			// worldToGridFloat of that sprite is (264/48, 224.8/48) =
			// (5.5, 4.683) — the same drift (+0.5x, -0.317y) that the bug
			// produced in production.
			const tower = buildTowerWithOffsetSprite(
				'archer',
				{ x: 5, y: 5 },
				{ x: 264, y: 224.8 },
			);

			// Two units, both comfortably in range (rangeSq = 2^2 = 4), but
			// the nearest-of-two winner flips between the two candidate
			// centers:
			//
			//   Unit X — grid (5, 5.5), world (240, 264). South of (5,5).
			//     distSq from (5, 5):        0.25    ← closest under FIX
			//     distSq from (5.5, 4.683):  0.917
			//   Unit Y — grid (6, 4.5), world (288, 216). NE of (5,5).
			//     distSq from (5, 5):        1.25
			//     distSq from (5.5, 4.683):  0.283   ← closest under BUG
			//
			// FIX → NearestInRange picks X (0.25 < 1.25).
			// BUG → NearestInRange picks Y (0.283 < 0.917).
			const unitX: UnitSnapshot = {
				instanceId: 'target_X',
				x: 240,
				y: 264,
				hp: 50,
				element: 'neutral',
			};
			const unitY: UnitSnapshot = {
				instanceId: 'target_Y',
				x: 288,
				y: 216,
				hp: 50,
				element: 'neutral',
			};

			const pushAttackLine = vi.fn();
			const ctx: AttackContext = {
				time: 5000,
				delta: 16,
				units: [unitX, unitY],
				gridManager: gm as never,
				effectiveDamage: 10,
				primaryTarget: null,
				pushDamage: vi.fn(),
				vfx: {
					pushAttackLine,
					acquireArrow: () => 0,
					spawnMuzzleVfx: vi.fn(),
					spawnImpactVfx: vi.fn(),
					playTowerAttackThrottled: vi.fn(),
					destroy: vi.fn(),
				} as never,
				resolveDamage: () => 10,
			};

			tower.update(ctx);

			expect(pushAttackLine).toHaveBeenCalledTimes(1);
			const line = pushAttackLine.mock.calls[0][0];
			// Fix: data.position (5,5) picks unit_X. Bug would pick unit_Y.
			expect(line.pendingDamage[0].unitId).toBe('target_X');
		});
	});
});
