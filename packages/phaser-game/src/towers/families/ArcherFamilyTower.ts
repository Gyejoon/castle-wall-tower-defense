import { BaseTower } from '../BaseTower';
import { SingleTargetAttack } from '../behaviors/SingleTargetAttack';
import { ArrowEmitter } from '../projectiles/ArrowEmitter';
import { BeamEmitter } from '../projectiles/BeamEmitter';
import { NearestInRange } from '../targeting/NearestInRange';
import type {
	AttackBehavior,
	ProjectileEmitter,
	TargetingStrategy,
	TowerConstructorDeps,
} from '../types';

export class ArcherFamilyTower extends BaseTower {
	readonly id = 'archer-family';
	protected readonly targeting: TargetingStrategy = new NearestInRange();
	protected readonly behaviors: readonly AttackBehavior[];
	protected readonly emitter: ProjectileEmitter;

	constructor(deps: TowerConstructorDeps) {
		super(deps);
		if (deps.def.id === 'archer') {
			this.emitter = new ArrowEmitter();
			// ArrowEmitter가 impact 시점에 pendingDamage로 데미지 적용한다.
			// 즉시 데미지 behavior를 추가하면 화살 도달 시 이중 타격이 된다.
			this.behaviors = [];
		} else {
			this.emitter = new BeamEmitter();
			this.behaviors = [new SingleTargetAttack()];
		}
	}
}
