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

	// Regression: BaseTower.update() must derive targeting grid from
	// `runtime.data.position` (integer, authoritative) rather than round-
	// tripping `sprite.x/y` through `worldToGridFloat`. Sprites carry a
	// PLATFORM_LIFT + 20px y-offset and gridToWorld/worldToGridFloat aren't
	// symmetric, so the sprite-derived path drifts by (+0.5x, -0.32y) cells
	// and flips range-boundary targeting decisions vs. the legacy path.
	describe('targeting parity (real GridManager round-trip)', () => {
		// Mirror the real GridManager math from
		// src/systems/GridManager.ts:140-155: gridToWorld places the tile
		// center at ((gx+0.5)*tile, (gy+0.5)*tile); worldToGridFloat inverts
		// that with the -0.5 offset. No offsetX/Y in this harness (offset
		// defaults to 0 without canvasWidth/canvasHeight).
		function realGridManager() {
			return {
				orthoTile: 48,
				getDepth: () => 10,
				gridToWorld: (gx: number, gy: number) => ({
					x: (gx + 0.5) * 48,
					y: (gy + 0.5) * 48,
				}),
				worldToGrid: (x: number, y: number) => ({
					x: Math.round(x / 48 - 0.5),
					y: Math.round(y / 48 - 0.5),
				}),
				worldToGridFloat: (x: number, y: number) => ({
					x: x / 48 - 0.5,
					y: y / 48 - 0.5,
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

		it('targets off data.position when sprite-derived grid would drift out of range', () => {
			const gm = realGridManager();
			// Tower grid (5,5). Sprite placed at a deliberately offset world
			// position whose worldToGridFloat round-trip lands at (~2.92,
			// ~2.92) — i.e. if BaseTower derived the targeting center from
			// sprite.x/y it would shift ~2.1 cells away from data.position.
			const tower = buildTowerWithOffsetSprite(
				'archer',
				{ x: 5, y: 5 },
				{ x: 164, y: 164 },
			);

			// Unit at grid (4,5): distance² from data.position (5,5) = 1 ≤
			// rangeSq(4) → should be targeted. Distance² from sprite-derived
			// (2.92,2.92) ≈ 5.5 → would be OUT of range. So this test fires
			// only when BaseTower uses data.position.
			const unit: UnitSnapshot = {
				instanceId: 'target_1',
				x: (4 + 0.5) * 48,
				y: (5 + 0.5) * 48,
				hp: 50,
				element: 'neutral',
			};

			const pushAttackLine = vi.fn();
			const ctx: AttackContext = {
				time: 5000,
				delta: 16,
				units: [unit],
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

			// Fix: tower uses data.position → in range → fires.
			// Regression: tower uses sprite-derived grid → out of range → no fire.
			expect(pushAttackLine).toHaveBeenCalledTimes(1);
			const line = pushAttackLine.mock.calls[0][0];
			expect(line.pendingDamage[0].unitId).toBe('target_1');
		});
	});
});
