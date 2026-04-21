import type { AttackBehavior, AttackContext, TowerRuntimeRef } from '../types';

export class SingleTargetAttack implements AttackBehavior {
	readonly id = 'single-target-attack';

	apply(ctx: AttackContext, tower: TowerRuntimeRef): void {
		const target = ctx.primaryTarget;
		if (!target) return;
		const damage = ctx.resolveDamage(target);
		// special 문자열이 없는 "focus" 타워만 armor pierce.
		const armorPierce = !tower.def.stats.special;
		ctx.pushDamage({ unitId: target.instanceId, damage, armorPierce });
	}
}
