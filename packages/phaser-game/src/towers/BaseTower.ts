import type {
	AttackBehavior,
	AttackContext,
	ProjectileEmitter,
	TargetingStrategy,
	TowerBehavior,
	TowerConstructorDeps,
	TowerRuntimeRef,
} from './types';

export abstract class BaseTower implements TowerBehavior {
	abstract readonly id: string;
	readonly runtime: TowerRuntimeRef;
	protected abstract readonly targeting: TargetingStrategy;
	protected abstract readonly behaviors: readonly AttackBehavior[];
	protected abstract readonly emitter: ProjectileEmitter;
	protected lastAttackMs = -Infinity;
	protected disabledUntilMs = 0;

	constructor(deps: TowerConstructorDeps) {
		const sprite = deps.sprite;
		this.runtime = {
			def: deps.def,
			data: deps.data,
			level: deps.level,
			sprite,
			barrelSprite: deps.barrelSprite,
			// onMoved 훅 없이도 moveTower 반영되도록 live-read.
			worldPos: {
				get x() {
					return sprite.x;
				},
				get y() {
					return sprite.y;
				},
			},
		};
	}

	disable(untilMs: number): void {
		this.disabledUntilMs = Math.max(this.disabledUntilMs, untilMs);
	}

	update(ctx: AttackContext): void {
		if (ctx.time < this.disabledUntilMs) return;
		const speed = this.runtime.def.stats.attackSpeed ?? 0;
		if (speed <= 0) {
			// attackSpeed<=0은 패시브 오라. 각 behavior 내부 쿨다운으로 동작.
			for (const b of this.behaviors) b.apply(ctx, this.runtime);
			return;
		}
		const interval = 1000 / speed;
		if (ctx.time - this.lastAttackMs < interval) return;
		const towerWorld = ctx.gridManager.gridToWorld(
			this.runtime.data.position.x,
			this.runtime.data.position.y,
		);
		const grid = ctx.gridManager.worldToGridFloat(towerWorld.x, towerWorld.y);
		const rangeCells = this.runtime.def.stats.range;
		const target = this.targeting.pick(
			grid,
			rangeCells * rangeCells,
			ctx.units,
			ctx.gridManager,
		);
		if (!target) return;
		this.lastAttackMs = ctx.time;
		const bound: AttackContext = { ...ctx, primaryTarget: target };
		for (const b of this.behaviors) b.apply(bound, this.runtime);
		this.emitter.emit(this.runtime.worldPos, target, this.runtime, bound);
	}

	destroy(): void {}
}
