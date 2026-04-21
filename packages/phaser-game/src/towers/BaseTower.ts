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
		this.runtime = {
			def: deps.def,
			data: deps.data,
			level: deps.level,
			sprite: deps.sprite,
			barrelSprite: deps.barrelSprite,
			worldPos: { x: deps.sprite.x, y: deps.sprite.y },
		};
	}

	disable(untilMs: number): void {
		this.disabledUntilMs = Math.max(this.disabledUntilMs, untilMs);
	}

	update(ctx: AttackContext): void {
		if (ctx.time < this.disabledUntilMs) return;
		const speed = this.runtime.def.stats.attackSpeed ?? 0;
		if (speed <= 0) {
			// Passive aura path: every behavior runs each frame; each is
			// responsible for its own internal cooldown via def stats.
			for (const b of this.behaviors) b.apply(ctx, this.runtime);
			return;
		}
		const interval = 1000 / speed;
		if (ctx.time - this.lastAttackMs < interval) return;
		const grid = ctx.gridManager.worldToGridFloat(
			this.runtime.worldPos.x,
			this.runtime.worldPos.y,
		);
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
