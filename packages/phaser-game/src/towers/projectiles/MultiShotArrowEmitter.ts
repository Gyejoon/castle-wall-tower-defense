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

// 데미지는 shotCount로 분할되어 각 화살 도달 시 적용되며, 총합은 1회치 데미지.
// stun은 각 화살에 동일 이벤트로 실려 applyStun의 Math.max 덕에 실효 1× 지속.
export class MultiShotArrowEmitter implements ProjectileEmitter {
	constructor(private readonly shotCount: number = 2) {}

	emit(
		_origin: { x: number; y: number },
		target: UnitSnapshot,
		tower: TowerRuntimeRef,
		ctx: AttackContext,
	): void {
		const data = tower.data;
		const towerWorld = ctx.gridManager.gridToWorld(
			data.position.x,
			data.position.y,
		);
		const towerGrid = ctx.gridManager.worldToGridFloat(
			towerWorld.x,
			towerWorld.y,
		);
		const fireLift = ctx.gridManager.hasPlacementAnchors()
			? 0
			: ctx.gridManager.orthoTile * PLATFORM_LIFT;
		const fireOriginY = towerWorld.y - fireLift;

		// TTL은 그리드 셀 거리 기준.
		const projSpeed = tower.def.stats.projectileSpeed;
		let baseMaxTtl: number;
		if (projSpeed && projSpeed > 0) {
			const targetGrid = ctx.gridManager.worldToGridFloat(target.x, target.y);
			const gdx = towerGrid.x - targetGrid.x;
			const gdy = towerGrid.y - targetGrid.y;
			const dist = Math.sqrt(gdx * gdx + gdy * gdy);
			baseMaxTtl = Math.round((dist / projSpeed) * 1000);
			baseMaxTtl = Math.max(40, Math.min(baseMaxTtl, 500));
		} else {
			baseMaxTtl = 120;
		}

		const color = parseHexColor(tower.def.color);
		const armorPierce = !tower.def.stats.special;

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
