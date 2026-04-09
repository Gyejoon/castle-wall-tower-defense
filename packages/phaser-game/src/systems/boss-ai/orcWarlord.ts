import { registerBossBehavior } from './registry';
import type { BossBehavior, BossContext } from './types';

class OrcWarlordBehavior implements BossBehavior {
	readonly id = 'orc_warlord';
	private summoned = false;

	onSpawn(_ctx: BossContext): void {
		this.summoned = false;
	}

	onTick(_ctx: BossContext, _deltaMs: number): void {}

	onDamageTaken(ctx: BossContext, hpRatio: number): void {
		if (!this.summoned && hpRatio <= 0.5) {
			this.summoned = true;
			for (let i = 0; i < 4; i++) {
				ctx.spawnUnit('battle_robot', ctx.boss.position);
			}
		}
	}

	isCcImmune(): boolean {
		return false;
	}

	destroy(): void {}
}

registerBossBehavior('orc_warlord', () => new OrcWarlordBehavior());
