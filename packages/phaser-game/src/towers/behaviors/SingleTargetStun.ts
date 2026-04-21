import { CC_AURA_CONFIGS, stunDurationMultiplier } from '@gld/shared';
import type { AttackBehavior, AttackContext, TowerRuntimeRef } from '../types';

/** Applies a stun effect to the primary target based on the tower's
 *  `def.stats.special` string (e.g. 'stun_300ms'). Duration logic mirrors
 *  legacy TowerSystem.ts:784-788: looks up CC_AURA_CONFIGS[configKey];
 *  if miss (which is always true for per-tower stun_XXXms specials),
 *  falls back to 1000ms. Then scales by stunDurationMultiplier(level).
 *
 *  The `_XXXms` suffix in def.stats.special is currently vestigial —
 *  legacy doesn't parse it. Preserved here for parity. */
export class SingleTargetStun implements AttackBehavior {
	readonly id = 'single-target-stun';

	apply(ctx: AttackContext, tower: TowerRuntimeRef): void {
		const target = ctx.primaryTarget;
		if (!target) return;
		const special = tower.def.stats.special;
		if (!special || !special.startsWith('stun')) return;
		if (special.includes('aoe')) return; // defer to AoeStun (not in this phase)
		const configKey = special.replace(/%/g, '');
		const baseDuration = CC_AURA_CONFIGS[configKey]?.durationMs ?? 1000;
		const level = tower.data.level ?? 1;
		const stunDuration = baseDuration * stunDurationMultiplier(level);
		ctx.pushDamage({
			unitId: target.instanceId,
			damage: 0,
			stun: { duration: stunDuration },
		});
	}
}
