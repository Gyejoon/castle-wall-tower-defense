import { registerBossBehavior } from './registry';
import type { BossBehavior, BossContext } from './types';

class ForgeMasterBehavior implements BossBehavior {
	readonly id = 'forge_master';
	private lastSealMs = 0;
	private readonly SEAL_INTERVAL_MS = 10_000;
	private readonly SEAL_DURATION_MS = 5_000;

	onSpawn(ctx: BossContext): void {
		this.lastSealMs = ctx.sceneTimeMs;
	}

	onTick(ctx: BossContext, _deltaMs: number): void {
		if (ctx.sceneTimeMs - this.lastSealMs < this.SEAL_INTERVAL_MS) return;
		this.lastSealMs = ctx.sceneTimeMs;
		// '__random__' sentinel: the wiring layer (Task 23) interprets this as
		// "pick a random tower from the active tower list".
		ctx.disableTower('__random__', ctx.sceneTimeMs + this.SEAL_DURATION_MS);
	}

	onDamageTaken(_ctx: BossContext, _hpRatio: number): void {}

	isCcImmune(): boolean {
		return false;
	}

	destroy(): void {}
}

registerBossBehavior('forge_master', () => new ForgeMasterBehavior());
