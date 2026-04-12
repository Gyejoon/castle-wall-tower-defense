import { registerBossBehavior } from './registry';
import type { BossBehavior, BossContext } from './types';

class CorruptedArchmageBehavior implements BossBehavior {
	readonly id = 'corrupted_archmage';

	onSpawn(ctx: BossContext): void {
		if (ctx.boss.metadata?.isClone) return; // clone does not clone itself
		ctx.spawnUnit(
			'corrupted_archmage',
			{ x: ctx.boss.position.x + 1, y: ctx.boss.position.y },
			{ isClone: true },
		);
	}

	onTick(_ctx: BossContext, _deltaMs: number): void {}

	onDamageTaken(_ctx: BossContext, _hpRatio: number): void {}

	isCcImmune(): boolean {
		return true;
	}

	destroy(): void {}
}

registerBossBehavior(
	'corrupted_archmage',
	() => new CorruptedArchmageBehavior(),
);
