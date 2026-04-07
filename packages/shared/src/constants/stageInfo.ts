import { MAP_REGISTRY } from './maps';
import { battleXp } from './meta';
import { UNITS } from './units';
import { getTotalWavesForMap, getWavesForMap } from './waves';

const unitBountyMap = new Map(UNITS.map((u) => [u.id, u.bounty]));

/** Max XP obtainable from a map (full clear, victory). */
export function getMaxXpForMap(mapId: string): number {
	const map = MAP_REGISTRY[mapId];
	if (!map) return 0;
	const totalWaves = getTotalWavesForMap(mapId);
	return Math.round(battleXp(totalWaves, true) * map.rewardMultiplier);
}

/** Max gold obtainable from a map (all monsters killed). */
export function getMaxGoldForMap(mapId: string): number {
	const map = MAP_REGISTRY[mapId];
	if (!map) return 0;
	const waves = getWavesForMap(mapId);
	let total = 0;
	for (const wave of waves) {
		for (const group of wave.groups) {
			const bounty = unitBountyMap.get(group.unitId) ?? 0;
			total += bounty * group.count;
		}
	}
	return Math.round(total * map.rewardMultiplier);
}
