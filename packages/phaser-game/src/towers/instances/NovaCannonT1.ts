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

// 다른 siege 타워와 차이: 회전 포신이 매 프레임 가장 가까운 적을 추적하고
// 발사 원점이 타워 월드 중심이 아닌 포신 끝이다.
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
		// 포신은 fire 쿨다운/disable과 무관하게 매 프레임 회전.
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

		super.update(ctx);
	}
}
