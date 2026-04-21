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

export class StunFamilyTower extends BaseTower {
	readonly id = 'stun-family';
	protected readonly targeting: TargetingStrategy = new NearestInRange();
	protected readonly behaviors: readonly AttackBehavior[];
	protected readonly emitter: ProjectileEmitter;

	constructor(deps: TowerConstructorDeps) {
		super(deps);
		if (deps.def.id === 'twin_archer') {
			// 화살 도달 시 데미지+스턴이 함께 적용되도록 emitter가 pendingDamage를 작성.
			this.behaviors = [];
			this.emitter = new MultiShotArrowEmitter(2);
		} else {
			this.behaviors = [new SingleTargetAttack(), new SingleTargetStun()];
			this.emitter = new BeamEmitter();
		}
	}
}
