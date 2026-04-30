import { PLATFORM_LIFT } from '../../fieldAssets';
import type {
	AttackContext,
	ProjectileEmitter,
	TowerRuntimeRef,
	UnitSnapshot,
} from '../types';
import { parseHexColor } from '../vfx/colors';
import type { AttackLineEntry } from '../vfx/TowerVfxController';

// 데미지는 이 emitter 실행 전 SingleTargetAttack이 push한다. 여기서는 VFX만 담당.
export class BeamEmitter implements ProjectileEmitter {
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

		const color = parseHexColor(tower.def.color);
		const fireLift =
			(ctx.gridManager.hasPlacementAnchors?.() ?? false)
				? 0
				: ctx.gridManager.orthoTile * PLATFORM_LIFT;
		const fireOriginY = towerWorld.y - fireLift;
		const maxTtl = 80;

		const line: AttackLineEntry = {
			x1: towerWorld.x,
			y1: fireOriginY,
			x2: target.x,
			y2: target.y,
			color,
			ttl: maxTtl,
			maxTtl,
			style: 'beam',
			towerType: tower.def.id,
		};
		ctx.vfx.pushAttackLine(line);

		ctx.vfx.spawnImpactVfx('projectile-hit-flash', target.x, target.y);

		ctx.vfx.spawnMuzzleVfx(
			tower.def.id,
			towerWorld,
			tower.data.position,
			tower.sprite,
		);
		ctx.vfx.playTowerAttackThrottled(tower.def.id, ctx.time);
	}
}
