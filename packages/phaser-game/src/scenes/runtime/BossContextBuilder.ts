import type { ActiveUnit } from '@gld/shared';
import type { BossContext } from '../../systems/boss-ai/types';
import type { TowerSystem } from '../../systems/TowerSystem';
import type { UnitSystem } from '../../systems/UnitSystem';

interface BossContextBuilderDeps {
	units: Pick<UnitSystem, 'spawnAdditionalUnit'>;
	towers: Pick<TowerSystem, 'getAllTowers' | 'disableTower'>;
	getSceneTime: () => number;
}

/**
 * Builds the per-tick `BossContext` that boss AI behaviors consume.
 * Extracted from `GameScene.buildBossContext` in Phase 6.
 *
 * The `disableTower('__random__', ...)` branch preserves the Corrupted
 * Archmage sentinel lifted straight from the inline version.
 */
export class BossContextBuilder {
	constructor(private readonly deps: BossContextBuilderDeps) {}

	build(boss: ActiveUnit): BossContext {
		const { units, towers, getSceneTime } = this.deps;
		return {
			boss,
			sceneTimeMs: getSceneTime(),
			spawnUnit: (unitId, pos, metadata) => {
				units.spawnAdditionalUnit(unitId, pos, metadata);
			},
			disableTower: (towerId, untilMs) => {
				if (towerId === '__random__') {
					const all = towers.getAllTowers();
					if (all.length === 0) return;
					const target = all[Math.floor(Math.random() * all.length)];
					towers.disableTower(target.data.instanceId, untilMs);
				} else {
					towers.disableTower(towerId, untilMs);
				}
			},
		};
	}
}
