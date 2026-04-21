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

// def.stats.special의 splash 배율 접미사는 무시되고 이 상수로 통일한다.
const SPLASH_RADIUS_SQ = 2.25;

export interface ArcEmitterOpts {
	fireOrigin?: (
		tower: TowerRuntimeRef,
		ctx: AttackContext,
	) => { x: number; y: number };
	spawnMuzzle?: (
		tower: TowerRuntimeRef,
		ctx: AttackContext,
		fireOrigin: { x: number; y: number },
	) => void;
}

export class ArcEmitter implements ProjectileEmitter {
	constructor(private readonly opts: ArcEmitterOpts = {}) {}

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
		const fireLift = ctx.gridManager.orthoTile * PLATFORM_LIFT;
		const fireOrigin = this.opts.fireOrigin
			? this.opts.fireOrigin(tower, ctx)
			: { x: towerWorld.x, y: towerWorld.y - fireLift };

		const pending: DamageEvent[] = [];

		const armorPierce = !tower.def.stats.special;
		pending.push({
			unitId: target.instanceId,
			damage: ctx.resolveDamage(target),
			armorPierce,
		});

		// Splash 범위는 주 타겟의 그리드 좌표 기준. 0.5× 데미지는 resolveSplashDamage에 내장.
		const targetGrid = ctx.gridManager.worldToGridFloat(target.x, target.y);
		for (const unit of ctx.units) {
			if (unit.instanceId === target.instanceId || unit.hp <= 0) continue;
			const unitGrid = ctx.gridManager.worldToGridFloat(unit.x, unit.y);
			const dx = targetGrid.x - unitGrid.x;
			const dy = targetGrid.y - unitGrid.y;
			if (dx * dx + dy * dy <= SPLASH_RADIUS_SQ) {
				pending.push({
					unitId: unit.instanceId,
					damage: ctx.resolveSplashDamage(unit),
				});
			}
		}

		// TTL은 픽셀이 아닌 그리드 셀 거리 기준.
		const projSpeed = tower.def.stats.projectileSpeed;
		let maxTtl: number;
		if (projSpeed && projSpeed > 0) {
			const gdx = data.position.x - targetGrid.x;
			const gdy = data.position.y - targetGrid.y;
			const dist = Math.sqrt(gdx * gdx + gdy * gdy);
			maxTtl = Math.round((dist / projSpeed) * 1000);
			maxTtl = Math.max(40, Math.min(maxTtl, 500));
		} else {
			maxTtl = 120;
		}

		const color = parseHexColor(tower.def.color);

		const line: AttackLineEntry = {
			x1: fireOrigin.x,
			y1: fireOrigin.y,
			x2: target.x,
			y2: target.y,
			color,
			ttl: maxTtl,
			maxTtl,
			style: 'arc',
			towerType: tower.def.id,
			targetUnitId: target.instanceId,
			impactPending: true,
			pendingDamage: pending,
			impactVfxKey: 'vfx-explosion-sm',
		};
		ctx.vfx.pushAttackLine(line);

		if (this.opts.spawnMuzzle) {
			this.opts.spawnMuzzle(tower, ctx, fireOrigin);
		} else {
			const gridPos = { x: data.position.x, y: data.position.y };
			ctx.vfx.spawnMuzzleVfx(tower.def.id, towerWorld, gridPos, tower.sprite);
		}

		ctx.vfx.playTowerAttackThrottled(tower.def.id, ctx.time);
	}
}
