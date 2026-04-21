import { BaseTower } from '../BaseTower';
import { SingleTargetAttack } from '../behaviors/SingleTargetAttack';
import { SingleTargetStun } from '../behaviors/SingleTargetStun';
import { BeamEmitter } from '../projectiles/BeamEmitter';
import { MultiShotArrowEmitter } from '../projectiles/MultiShotArrowEmitter';
import { NearestInRange } from '../targeting/NearestInRange';
import type {
	AttackBehavior,
	ProjectileEmitter,
	TargetingStrategy,
	TowerConstructorDeps,
} from '../types';

/** Stun family: shield/twin_archer/holy_shrine/divine_throne.
 *  - twin_archer (T2): 2-shot arrow projectile, damage split in half,
 *    stun event deferred to impact along with damage.
 *  - shield/holy_shrine/divine_throne: beam projectile, immediate damage
 *    + immediate stun event (two separate DamageEvents pushed per fire).
 *
 *  NOTE: Only these 4 IDs reach this class via instances/stun.ts. Any
 *  other id routed here silently takes the beam path — acceptable since
 *  mis-registration would surface in tests.
 */
export class StunFamilyTower extends BaseTower {
	readonly id = 'stun-family';
	protected readonly targeting: TargetingStrategy = new NearestInRange();
	protected readonly behaviors: readonly AttackBehavior[];
	protected readonly emitter: ProjectileEmitter;

	constructor(deps: TowerConstructorDeps) {
		super(deps);
		if (deps.def.id === 'twin_archer') {
			// MultiShotArrowEmitter authors the damage+stun batch into
			// pendingDamage on each arrow; legacy applies damage on impact.
			this.behaviors = [];
			this.emitter = new MultiShotArrowEmitter(2);
		} else {
			this.behaviors = [new SingleTargetAttack(), new SingleTargetStun()];
			this.emitter = new BeamEmitter();
		}
	}
}
