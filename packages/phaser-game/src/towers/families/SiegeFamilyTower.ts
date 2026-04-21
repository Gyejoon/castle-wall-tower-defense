import { BaseTower } from '../BaseTower';
import { ArcEmitter } from '../projectiles/ArcEmitter';
import { NearestInRange } from '../targeting/NearestInRange';
import type {
	AttackBehavior,
	ProjectileEmitter,
	TargetingStrategy,
	TowerConstructorDeps,
} from '../types';

/** Siege family: fortress / earth_golem / celestial. All use arc-style
 *  projectiles with splash damage authored by `ArcEmitter`. Behaviors
 *  array is empty — the emitter owns main + splash damage event creation
 *  because arc projectiles defer all damage to impact via `pendingDamage`
 *  (legacy mirror: TowerSystem.ts:857-861 `!hasProjectile` guard).
 *
 *  nova_cannon uses the `NovaCannonT1` subclass (in instances/NovaCannonT1.ts)
 *  for its rotating barrel + barrel-tip fire origin.
 */
export class SiegeFamilyTower extends BaseTower {
	readonly id = 'siege-family';
	protected readonly targeting: TargetingStrategy = new NearestInRange();
	protected readonly behaviors: readonly AttackBehavior[] = [];
	protected readonly emitter: ProjectileEmitter = new ArcEmitter();

	constructor(deps: TowerConstructorDeps) {
		super(deps);
	}
}
