import { CC_AURA_CONFIGS, stunDurationMultiplier } from '@gld/shared';
import { PLATFORM_LIFT } from '../../fieldAssets';
import type {
	AttackContext,
	DamageEvent,
	ProjectileEmitter,
	TowerRuntimeRef,
	UnitSnapshot,
} from '../types';
import { parseHexColor } from '../vfx/colors';
import type { AttackLineEntry } from '../vfx/TowerVfxController';

/** Multi-shot arrow emitter (twin_archer pattern). Fires N arrows with
 *  staggered ttl + offsetY; each arrow's pendingDamage carries a
 *  HALVED damage event plus the stun event (damage=0). Legacy applies
 *  stun twice (once per arrow) but UnitSystem.applyStun uses Math.max,
 *  so the effective stun duration is 1×. Damage is split 2× (half each
 *  arrow) → total = full damage.
 *
 *  Behaviors remain empty on the owning tower — this emitter authors the
 *  full pendingDamage batch (damage + stun). Legacy mirror:
 *  TowerSystem.ts:784-825 (stun event build), :913-954 (2-shot fire
 *  loop with offsetY and +80ms stagger). */
export class MultiShotArrowEmitter implements ProjectileEmitter {
	constructor(private readonly shotCount: number = 2) {}

	emit(
		_origin: { x: number; y: number },
		target: UnitSnapshot,
		tower: TowerRuntimeRef,
		ctx: AttackContext,
	): void {
		const data = tower.data;
		// Match ArrowEmitter/BeamEmitter: use grid-derived world position
		// for attackLine fireOrigin (NOT sprite.x/sprite.y which has lift).
		const towerWorld = ctx.gridManager.gridToWorld(
			data.position.x,
			data.position.y,
		);
		const fireLift = ctx.gridManager.orthoTile * PLATFORM_LIFT;
		const fireOriginY = towerWorld.y - fireLift;

		// TTL: grid-space distance from tower grid to target grid (not pixels),
		// matching ArrowEmitter. Legacy: TowerSystem.ts:842-851.
		const projSpeed = tower.def.stats.projectileSpeed;
		let baseMaxTtl: number;
		if (projSpeed && projSpeed > 0) {
			const targetGrid = ctx.gridManager.worldToGridFloat(target.x, target.y);
			const gdx = data.position.x - targetGrid.x;
			const gdy = data.position.y - targetGrid.y;
			const dist = Math.sqrt(gdx * gdx + gdy * gdy);
			baseMaxTtl = Math.round((dist / projSpeed) * 1000);
			baseMaxTtl = Math.max(40, Math.min(baseMaxTtl, 500));
		} else {
			baseMaxTtl = 120;
		}

		const color = parseHexColor(tower.def.color);
		// Legacy: armorPierce = !def.stats.special. twin_archer has a
		// `stun_500ms` special → false.
		const armorPierce = !tower.def.stats.special;

		// Build shared batch: halved damage + full-duration stun.
		const fullDamage = ctx.resolveDamage(target);
		const halvedDamage = Math.round(fullDamage / this.shotCount);
		const batch: DamageEvent[] = [
			{ unitId: target.instanceId, damage: halvedDamage, armorPierce },
		];
		const special = tower.def.stats.special;
		if (special?.startsWith('stun') && !special.includes('aoe')) {
			const configKey = special.replace(/%/g, '');
			const baseDuration = CC_AURA_CONFIGS[configKey]?.durationMs ?? 1000;
			const level = tower.data.level ?? 1;
			const stunDuration = baseDuration * stunDurationMultiplier(level);
			batch.push({
				unitId: target.instanceId,
				damage: 0,
				stun: { duration: stunDuration },
			});
		}

		for (let shot = 0; shot < this.shotCount; shot++) {
			const arrowIndex = ctx.vfx.acquireArrow();
			const offsetY = shot === 0 ? -4 : 4;
			const shotTtl = shot === 0 ? baseMaxTtl : baseMaxTtl + 80;
			const line: AttackLineEntry = {
				x1: towerWorld.x,
				y1: fireOriginY + offsetY,
				x2: target.x,
				y2: target.y + offsetY,
				color,
				ttl: shotTtl,
				maxTtl: shotTtl,
				style: 'arrow',
				towerType: tower.def.id,
				arrowIndex,
				targetUnitId: target.instanceId,
				impactPending: true,
				pendingDamage: batch,
				impactVfxKey: 'projectile-hit-flash',
			};
			ctx.vfx.pushAttackLine(line);
		}

		ctx.vfx.spawnMuzzleVfx(
			tower.def.id,
			towerWorld,
			{ x: data.position.x, y: data.position.y },
			tower.sprite,
		);
		ctx.vfx.playTowerAttackThrottled(tower.def.id, ctx.time);
	}
}
