import { BaseTower } from '../BaseTower';
import { SingleTargetAttack } from '../behaviors/SingleTargetAttack';
import { SingleTargetSlow } from '../behaviors/SingleTargetSlow';
import { BeamEmitter } from '../projectiles/BeamEmitter';
import { NearestInRange } from '../targeting/NearestInRange';
import type {
	AttackBehavior,
	ProjectileEmitter,
	TargetingStrategy,
	TowerConstructorDeps,
} from '../types';

/** Frost family: emp/stasis_field/disruptor/world_tree. All single-target
 *  beam towers. The beam applies damage via SingleTargetAttack (no armor
 *  pierce — `special` is set for all 4 defIds) and slow via
 *  SingleTargetSlow (parses `slow_XX%` from def.stats.special).
 *
 *  NOTE: Only these 4 IDs reach this class via instances/frost.ts. Any
 *  defId routed here without a `slow_XX%` special will still fire the
 *  beam and deal damage; SingleTargetSlow silently no-ops if the special
 *  string doesn't match.
 */
export class FrostFamilyTower extends BaseTower {
	readonly id = 'frost-family';
	protected readonly targeting: TargetingStrategy = new NearestInRange();
	protected readonly behaviors: readonly AttackBehavior[] = [
		new SingleTargetAttack(),
		new SingleTargetSlow(),
	];
	protected readonly emitter: ProjectileEmitter = new BeamEmitter();

	constructor(deps: TowerConstructorDeps) {
		super(deps);
	}
}
