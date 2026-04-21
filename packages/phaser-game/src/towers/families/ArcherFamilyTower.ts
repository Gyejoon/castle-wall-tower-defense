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

/** Archer/wind_spire/flame_tower/arcane_spire share the same fire
 *  loop: nearest-in-range targeting, single-target armor-piercing hit.
 *  Projectile style differs per def:
 *   - `archer` → ArrowEmitter (deferred damage via attack-line
 *     `pendingDamage`, applied on impact by the legacy render loop at
 *     TowerSystem.ts:1056-1074). Behaviors array stays empty so damage is
 *     authored by the emitter alone — applying damage immediately via
 *     `SingleTargetAttack` would double-hit when the arrow lands.
 *   - `wind_spire` / `flame_tower` / `arcane_spire` → BeamEmitter
 *     (instant damage via `SingleTargetAttack`, beam attack-line for the
 *     render loop, immediate impact VFX).
 *
 *  The archer-vs-beam split mirrors the legacy `style` selector at
 *  TowerSystem.ts:826-831: only archer/twin_archer get 'arrow'; other
 *  single-target archer-family towers default to 'beam'. */
export class ArcherFamilyTower extends BaseTower {
	readonly id = 'archer-family';
	protected readonly targeting: TargetingStrategy = new NearestInRange();
	protected readonly behaviors: readonly AttackBehavior[];
	protected readonly emitter: ProjectileEmitter;

	constructor(deps: TowerConstructorDeps) {
		super(deps);
		if (deps.def.id === 'archer') {
			this.emitter = new ArrowEmitter();
			// Arrow projectile defers damage to impact — no immediate-damage
			// behavior or the unit takes damage twice (once at fire, once at
			// impact).
			this.behaviors = [];
		} else {
			// wind_spire / flame_tower / arcane_spire fire instant beams.
			this.emitter = new BeamEmitter();
			this.behaviors = [new SingleTargetAttack()];
		}
	}
}
