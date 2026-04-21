import type { AttackBehavior, AttackContext, TowerRuntimeRef } from '../types';

/** Applies a slow effect to the primary target based on the tower's
 *  `def.stats.special` string (e.g. 'slow_30%'). Parses the percentage,
 *  converts to the speed multiplier remaining (1 - pct/100), and pushes
 *  a damage=0 event with `slow: { factor, duration }`.
 *
 *  Does nothing if the special is missing or doesn't start with 'slow_'.
 *  AoE variants (`slow_XX%_aoe`) are NOT handled here — those need
 *  AoeSlowBehavior in a later phase.
 *
 *  Mirrors legacy TowerSystem.ts:744-747 single-target slow path. The
 *  legacy code combines damage + slow on a single DamageEvent; here we
 *  split into two events (damage from SingleTargetAttack, slow-only with
 *  damage=0 from this behavior). The downstream UnitSystem processes
 *  damage and slow independently, so the split is observationally
 *  equivalent. */
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
