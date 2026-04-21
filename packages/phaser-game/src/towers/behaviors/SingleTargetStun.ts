import { CC_AURA_CONFIGS, stunDurationMultiplier } from '@gld/shared';
import type { AttackBehavior, AttackContext, TowerRuntimeRef } from '../types';

// `_XXXms` 서픽스는 파싱하지 않고 CC_AURA_CONFIGS 조회 실패 시 1000ms로 fallback.
export class SingleTargetStun implements AttackBehavior {
	readonly id = 'single-target-stun';

	apply(ctx: AttackContext, tower: TowerRuntimeRef): void {
		const target = ctx.primaryTarget;
		if (!target) return;
		const special = tower.def.stats.special;
		if (!special || !special.startsWith('stun')) return;
		// AoE 변형은 별도 behavior 담당.
		if (special.includes('aoe')) return;
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
