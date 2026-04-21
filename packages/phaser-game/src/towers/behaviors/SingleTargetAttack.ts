import type {
	AttackBehavior,
	AttackContext,
	TowerRuntimeRef,
} from '../types';

/** Pushes a single DamageEvent against the primary target using the
 *  fully-modified damage from `ctx.resolveDamage`. `armorPierce` is
 *  determined by the tower def — true when there's no `special` string
 *  (the "focus tower" case at TowerSystem.ts:717-718). */
export class SingleTargetAttack implements AttackBehavior {
	readonly id = 'single-target-attack';

	apply(ctx: AttackContext, tower: TowerRuntimeRef): void {
		const target = ctx.primaryTarget;
		if (!target) return;
		const damage = ctx.resolveDamage(target);
		const armorPierce = !tower.def.stats.special;
		ctx.pushDamage({ unitId: target.instanceId, damage, armorPierce });
	}
}
