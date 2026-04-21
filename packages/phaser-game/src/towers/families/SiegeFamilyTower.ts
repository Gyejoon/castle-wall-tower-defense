import { BaseTower } from '../BaseTower';
import { ArcEmitter } from '../projectiles/ArcEmitter';
import { NearestInRange } from '../targeting/NearestInRange';
import type {
	AttackBehavior,
	ProjectileEmitter,
	TargetingStrategy,
	TowerConstructorDeps,
} from '../types';

// Arc projectile이 impact 시 main+splash 데미지를 모두 발행하므로 behaviors는 빈 배열.
export class SiegeFamilyTower extends BaseTower {
	readonly id = 'siege-family';
	protected readonly targeting: TargetingStrategy = new NearestInRange();
	protected readonly behaviors: readonly AttackBehavior[] = [];
	protected readonly emitter: ProjectileEmitter = new ArcEmitter();

	constructor(deps: TowerConstructorDeps) {
		super(deps);
	}
}
