import type { BossBehavior } from '../../systems/boss-ai/types';
import type { DamageNumberSystem } from '../../systems/DamageNumberSystem';
import type { PhaseAOrchestrator } from '../../systems/PhaseAOrchestrator';
import type { TowerSystem } from '../../systems/TowerSystem';
import type { UnitSystem } from '../../systems/UnitSystem';

type ApplyDamageResult = NonNullable<ReturnType<UnitSystem['applyDamage']>>;

interface CombatMediatorDeps {
	towers: Pick<TowerSystem, 'update'>;
	units: Pick<
		UnitSystem,
		| 'applyDamage'
		| 'applySlow'
		| 'applyStun'
		| 'getUnitPositions'
		| 'getUnitWorldPos'
		| 'update'
	>;
	damageNumbers: Pick<DamageNumberSystem, 'show' | 'showMiss'>;
	/**
	 * Live reference to Game.ts's bossBehaviors Map (READ ONLY). Game.ts
	 * retains ownership — it populates on spawn, removes on defeat.
	 * CombatMediator only reads to consult isCcImmune() per unit.
	 */
	bossBehaviors: ReadonlyMap<string, BossBehavior>;
	orchestrator: PhaseAOrchestrator | undefined;
	isPhaseAMap: boolean;
}

/**
 * Tick-scoped combat mediator: tower→unit damage dispatch, CC application
 * with boss immunity guard, floating damage numbers, and gold accumulation
 * via callback. Extracted from `Game.ts.processCombatField` in Phase 6.
 *
 * Invariants preserved from the inline form:
 *  - Damage events with `damage > 0` route through `units.applyDamage`,
 *    show a floating number for `hit`, MISS for `miss`, nothing for
 *    `absorbed`/`invulnerable`.
 *  - `onKill` fires once per killed unit; bounty comes from applyDamage.
 *  - `effectAmp` multiplier from the Phase A orchestrator is applied to
 *    slow/stun durations when and only when `isPhaseAMap && orchestrator`.
 *  - Boss CC immunity (`bossBehaviors.get(unitId)?.isCcImmune()`) gates
 *    both slow and stun. `tests/characterization/BossCcImmunity.test.ts`
 *    pins this predicate.
 */
export class CombatMediator {
	constructor(private readonly deps: CombatMediatorDeps) {}

	tick(
		time: number,
		delta: number,
		onKill: (evt: { bounty: number }) => void,
		onDamageResult?: (unitId: string, result: ApplyDamageResult | null) => void,
	): {
		reachedExit: Array<{ id: string; isBoss: boolean }>;
		damageEvents: number;
	} {
		const { towers, units, damageNumbers, bossBehaviors, orchestrator } =
			this.deps;

		const unitPositions = units.getUnitPositions();
		const damageEvents = towers.update(time, delta, unitPositions);

		const effectAmp =
			this.deps.isPhaseAMap && orchestrator
				? orchestrator.getEffectDurationMultiplier()
				: 1;

		for (const evt of damageEvents) {
			if (evt.damage > 0) {
				const pos = units.getUnitWorldPos(evt.unitId);
				const result = units.applyDamage(
					evt.unitId,
					evt.damage,
					evt.armorPierce,
				);
				if (pos && result) {
					if (result.outcome === 'hit') {
						damageNumbers.show(pos.x, pos.y, result.actualDamage);
					} else if (result.outcome === 'miss') {
						damageNumbers.showMiss(pos.x, pos.y);
					}
				}
				onDamageResult?.(evt.unitId, result);
				if (result?.killed) {
					onKill({ bounty: result.bounty });
				}
			}

			if (evt.slow) {
				const behavior = bossBehaviors.get(evt.unitId);
				if (!behavior?.isCcImmune()) {
					units.applySlow(
						evt.unitId,
						evt.slow.factor,
						evt.slow.duration * effectAmp,
					);
				}
			}
			if (evt.stun) {
				const behavior = bossBehaviors.get(evt.unitId);
				if (!behavior?.isCcImmune()) {
					units.applyStun(evt.unitId, evt.stun.duration * effectAmp);
				}
			}
		}

		const { reachedExit } = units.update(time, delta);
		return { reachedExit, damageEvents: damageEvents.length };
	}
}
