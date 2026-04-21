import { PLATFORM_LIFT } from '../../fieldAssets';
import type {
	AttackContext,
	ProjectileEmitter,
	TowerRuntimeRef,
	UnitSnapshot,
} from '../types';
import type { AttackLineEntry } from '../vfx/TowerVfxController';

/** Instant beam projectile. Damage is pushed by `SingleTargetAttack`
 *  before this emitter runs; we only produce the visual beam line and the
 *  immediate impact flash. Mirrors the beam branch of the legacy fire
 *  path at TowerSystem.ts:857-861 (immediate damage push) and
 *  TowerSystem.ts:903-936 (beam attack-line + impact VFX). */
export class BeamEmitter implements ProjectileEmitter {
	emit(
		_origin: { x: number; y: number },
		target: UnitSnapshot,
		tower: TowerRuntimeRef,
		ctx: AttackContext,
	): void {
		// See ArrowEmitter: `origin` is the sprite-lifted sprite position, but
		// legacy uses grid-world as `towerWorld` for VFX. Recompute from
		// data.position so both paths produce identical attack-lines.
		const towerWorld = ctx.gridManager.gridToWorld(
			tower.data.position.x,
			tower.data.position.y,
		);

		const color = parseHexColor(tower.def.color);
		const fireLift = ctx.gridManager.orthoTile * PLATFORM_LIFT;
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

		// Beam: instant impact VFX — archer-family beams never splash, so the
		// VFX key is the plain hit-flash (mirrors TowerSystem.ts:929-936).
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

function parseHexColor(hex: string): number {
	return parseInt(hex.replace('#', ''), 16);
}
