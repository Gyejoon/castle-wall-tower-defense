import type { AttackBehavior, AttackContext, TowerRuntimeRef } from '../types';

// def.stats.special이 `slow_XX%` 포맷이어야 하며 AoE 변형은 별도 behavior가 담당.
export class SingleTargetSlow implements AttackBehavior {
	readonly id = 'single-target-slow';
	private static readonly DEFAULT_DURATION_MS = 2000;

	apply(ctx: AttackContext, tower: TowerRuntimeRef): void {
		const target = ctx.primaryTarget;
		if (!target) return;
		const special = tower.def.stats.special;
		if (!special || !special.startsWith('slow_')) return;
		const match = special.match(/slow_(\d+)%/);
		if (!match) return;
		const factor = 1 - parseInt(match[1], 10) / 100;
		ctx.pushDamage({
			unitId: target.instanceId,
			damage: 0,
			slow: { factor, duration: SingleTargetSlow.DEFAULT_DURATION_MS },
		});
	}
}
