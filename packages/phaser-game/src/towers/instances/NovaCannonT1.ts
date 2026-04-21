import { BaseTower } from '../BaseTower';
import { ArcEmitter } from '../projectiles/ArcEmitter';
import { NearestInRange } from '../targeting/NearestInRange';
import type {
	AttackBehavior,
	AttackContext,
	ProjectileEmitter,
	TargetingStrategy,
	TowerConstructorDeps,
	TowerRuntimeRef,
} from '../types';

/** T1 Siege — nova_cannon. Unique behavior vs. other siege towers:
 *  - Rotating barrel sprite tracks nearest enemy every frame (independent
 *    of fire cadence). Mirrors legacy TowerSystem.ts:597-621.
 *  - Fire origin is barrel-tip, not tower world center:
 *    `barrel.x + cos(rot)*10, barrel.y + sin(rot)*10`. Mirrors legacy
 *    TowerSystem.ts:772-781.
 *  - Muzzle VFX is a hit-flash at the barrel-tip instead of the animated
 *    muzzle spritesheet used by other towers. Mirrors legacy
 *    TowerSystem.ts:826-831.
 */
export class NovaCannonT1 extends BaseTower {
	readonly id = 'nova-cannon-t1';
	protected readonly targeting: TargetingStrategy = new NearestInRange();
	protected readonly behaviors: readonly AttackBehavior[] = [];
	protected readonly emitter: ProjectileEmitter;

	constructor(deps: TowerConstructorDeps) {
		super(deps);
		const fireOrigin = (tower: TowerRuntimeRef) => {
			const barrel = tower.barrelSprite;
			if (!barrel) {
				// Fallback: tower world center (same as default siege path
				// without platform lift — legacy also skips the lift when the
				// barrel branch fires, since the barrel sprite IS the lifted
				// base position reference).
				return { x: tower.worldPos.x, y: tower.worldPos.y };
			}
			return {
				x: barrel.x + Math.cos(barrel.rotation) * 10,
				y: barrel.y + Math.sin(barrel.rotation) * 10,
			};
		};
		const spawnMuzzle = (
			tower: TowerRuntimeRef,
			ctx: AttackContext,
			origin: { x: number; y: number },
		) => {
			ctx.vfx.spawnImpactVfx('projectile-hit-flash', origin.x, origin.y);
		};
		this.emitter = new ArcEmitter({ fireOrigin, spawnMuzzle });
	}

	override update(ctx: AttackContext): void {
		// Rotate barrel toward nearest living unit every frame, matching
		// legacy TowerSystem.ts:597-621. Runs independent of fire cooldown —
		// the barrel tracks continuously even while the tower is disabled or
		// on cooldown.
		const barrel = this.runtime.barrelSprite;
		if (barrel) {
			const data = this.runtime.data;
			const towerWorld = ctx.gridManager.gridToWorld(
				data.position.x,
				data.position.y,
			);
			let nearestDistSq = Infinity;
			let nearestUnit: { x: number; y: number } | null = null;
			for (const unit of ctx.units) {
				if (unit.hp <= 0) continue;
				const dx = unit.x - towerWorld.x;
				const dy = unit.y - towerWorld.y;
				const dsq = dx * dx + dy * dy;
				if (dsq < nearestDistSq) {
					nearestDistSq = dsq;
					nearestUnit = unit;
				}
			}
			if (nearestUnit) {
				barrel.rotation = Math.atan2(
					nearestUnit.y - towerWorld.y,
					nearestUnit.x - towerWorld.x,
				);
			}
		}

		// Delegate to BaseTower fire logic (disabled check, cooldown,
		// targeting, behaviors, emitter).
		super.update(ctx);
	}
}
