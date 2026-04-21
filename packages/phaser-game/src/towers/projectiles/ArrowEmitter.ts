import { PLATFORM_LIFT } from '../../fieldAssets';
import type {
	AttackContext,
	ProjectileEmitter,
	TowerRuntimeRef,
	UnitSnapshot,
} from '../types';
import { parseHexColor } from '../vfx/colors';
import type { AttackLineEntry } from '../vfx/TowerVfxController';

/** Emits an arrow-style projectile with `impactPending` semantics. For
 *  arrow projectiles the legacy render loop at TowerSystem.ts:1056-1074
 *  applies damage on impact rather than at fire — so the emitter owns
 *  damage entry construction via `pendingDamage` and does NOT push through
 *  `ctx.pushDamage`. This matches the `!hasProjectile` guard at
 *  TowerSystem.ts:857-861. */
export class ArrowEmitter implements ProjectileEmitter {
	emit(
		_origin: { x: number; y: number },
		target: UnitSnapshot,
		tower: TowerRuntimeRef,
		ctx: AttackContext,
	): void {
		// `origin` argument is intentionally ignored — BaseTower passes the
		// sprite's world position, but archer-family legacy uses the raw grid
		// center (pre-lift) as `towerWorld`. Recompute here so both the
		// attack-line fireOriginY and muzzle VFX placement match
		// TowerSystem.ts:665-668 / :868-876 exactly.
		const towerWorld = ctx.gridManager.gridToWorld(
			tower.data.position.x,
			tower.data.position.y,
		);

		// TTL math replicates TowerSystem.ts:842-851. `dist` is in *grid units*
		// (legacy used `sqrt(closestDistSq)` where closestDistSq was grid-space),
		// not pixels — so recompute via `worldToGridFloat` here.
		const projSpeed = tower.def.stats.projectileSpeed;
		let maxTtl: number;
		if (projSpeed && projSpeed > 0) {
			const targetGrid = ctx.gridManager.worldToGridFloat(target.x, target.y);
			const gdx = tower.data.position.x - targetGrid.x;
			const gdy = tower.data.position.y - targetGrid.y;
			const dist = Math.sqrt(gdx * gdx + gdy * gdy);
			maxTtl = Math.round((dist / projSpeed) * 1000);
			maxTtl = Math.max(40, Math.min(maxTtl, 500));
		} else {
			maxTtl = 120;
		}

		const arrowIndex = ctx.vfx.acquireArrow();
		const color = parseHexColor(tower.def.color);
		const fireLift = ctx.gridManager.orthoTile * PLATFORM_LIFT;
		const fireOriginY = towerWorld.y - fireLift;

		const damage = ctx.resolveDamage(target);
		const armorPierce = !tower.def.stats.special;

		const line: AttackLineEntry = {
			x1: towerWorld.x,
			y1: fireOriginY,
			x2: target.x,
			y2: target.y,
			color,
			ttl: maxTtl,
			maxTtl,
			style: 'arrow',
			towerType: tower.def.id,
			arrowIndex,
			targetUnitId: target.instanceId,
			impactPending: true,
			pendingDamage: [{ unitId: target.instanceId, damage, armorPierce }],
			impactVfxKey: 'projectile-hit-flash',
		};
		ctx.vfx.pushAttackLine(line);

		ctx.vfx.spawnMuzzleVfx(
			tower.def.id,
			towerWorld,
			tower.data.position,
			tower.sprite,
		);
		ctx.vfx.playTowerAttackThrottled(tower.def.id, ctx.time);
	}
}
