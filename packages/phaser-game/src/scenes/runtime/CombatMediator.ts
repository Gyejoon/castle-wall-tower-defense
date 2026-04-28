import type { BossBehavior } from '../../systems/boss-ai/types';
import type { CoreOrchestrator } from '../../systems/CoreOrchestrator';
import type { DamageNumberSystem } from '../../systems/DamageNumberSystem';
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
	// 소유는 Game.ts. 여기서는 CC 면역 조회만 한다.
	bossBehaviors: ReadonlyMap<string, BossBehavior>;
	orchestrator: CoreOrchestrator | undefined;
	isGameMap: boolean;
}

// CC 면역 분기는 BossCcImmunity.test.ts가 고정한다.
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
			this.deps.isGameMap && orchestrator
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
