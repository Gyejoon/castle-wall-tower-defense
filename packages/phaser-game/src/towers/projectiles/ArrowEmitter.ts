import { PLATFORM_LIFT } from '../../fieldAssets';
import type {
	AttackContext,
	ProjectileEmitter,
	TowerRuntimeRef,
	UnitSnapshot,
} from '../types';
import { parseHexColor } from '../vfx/colors';
import type { AttackLineEntry } from '../vfx/TowerVfxController';

// 데미지는 화살이 타겟에 도달할 때 pendingDamage로 적용된다. ctx.pushDamage 경유 금지.
export class ArrowEmitter implements ProjectileEmitter {
	emit(
		_origin: { x: number; y: number },
		target: UnitSnapshot,
		tower: TowerRuntimeRef,
		ctx: AttackContext,
	): void {
		const towerWorld = ctx.gridManager.gridToWorld(
			tower.data.position.x,
			tower.data.position.y,
		);
		const towerGrid = ctx.gridManager.worldToGridFloat(
			towerWorld.x,
			towerWorld.y,
		);

		// TTL은 그리드 셀 거리 기준 (픽셀 아님).
		const projSpeed = tower.def.stats.projectileSpeed;
		let maxTtl: number;
		if (projSpeed && projSpeed > 0) {
			const targetGrid = ctx.gridManager.worldToGridFloat(target.x, target.y);
			const gdx = towerGrid.x - targetGrid.x;
			const gdy = towerGrid.y - targetGrid.y;
			const dist = Math.sqrt(gdx * gdx + gdy * gdy);
			maxTtl = Math.round((dist / projSpeed) * 1000);
			maxTtl = Math.max(40, Math.min(maxTtl, 500));
		} else {
			maxTtl = 120;
		}

		const arrowIndex = ctx.vfx.acquireArrow();
		const color = parseHexColor(tower.def.color);
		const fireLift =
			(ctx.gridManager.hasPlacementAnchors?.() ?? false)
				? 0
				: ctx.gridManager.orthoTile * PLATFORM_LIFT;
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
