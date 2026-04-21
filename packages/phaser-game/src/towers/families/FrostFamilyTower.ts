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
