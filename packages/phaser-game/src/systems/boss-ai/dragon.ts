import { registerBossBehavior } from './registry';
import type { BossBehavior, BossContext } from './types';

/**
 * Wave-50 final boss. Flying + CC-resistant + periodic ember spawn so the
 * arena keeps threat volume up while the dragon crawls in. Mirrors the
 * orc_warlord escort trigger but fires at both 66% and 33% HP, scaling the
 * spawn count with the phase so late-phase pressure ramps.
 */
class DragonBehavior implements BossBehavior {
	readonly id = 'dragon';
	private triggered66 = false;
	private triggered33 = false;

	onSpawn(_ctx: BossContext): void {
		this.triggered66 = false;
		this.triggered33 = false;
	}

	onTick(_ctx: BossContext, _deltaMs: number): void {}

	onDamageTaken(ctx: BossContext, hpRatio: number): void {
		if (!this.triggered66 && hpRatio <= 0.66) {
			this.triggered66 = true;
			for (let i = 0; i < 3; i++) {
				ctx.spawnUnit('flame_imp', ctx.boss.position);
			}
		}
		if (!this.triggered33 && hpRatio <= 0.33) {
			this.triggered33 = true;
			for (let i = 0; i < 6; i++) {
				ctx.spawnUnit('flame_imp', ctx.boss.position);
			}
		}
	}

	/**
	 * CC resistance on the unit def handles the probabilistic dodge. This
	 * method gates the all-or-nothing immunity used by the post-hit slow/
	 * stun pipeline — we let the dragon take CC so frost/stun upgrades have
	 * value, and rely on `bossCcResist=0.8` to cut durations hard.
	 */
	isCcImmune(): boolean {
		return false;
	}

	destroy(): void {}
}

registerBossBehavior('dragon', () => new DragonBehavior());
