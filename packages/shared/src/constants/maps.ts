// Source of truth moved to packages/shared/src/maps/*.tmj.json.
// This shim exists for backwards-compatible import paths.
import type { Position } from '../types/grid';
import type { MapLayout } from '../types/map';

export {
	ALL_MAPS,
	FOREST_GATE_MAP,
	getAllPathCells,
	getMapPaths,
	LAVA_FORTRESS_MAP,
	STORM_CITADEL_MAP,
} from '../maps';

import {
	getMapById as _getMapById,
	FOREST_GATE_MAP,
	getMapPaths,
	LAVA_FORTRESS_MAP,
	STORM_CITADEL_MAP,
} from '../maps';

export const MAP_REGISTRY: Record<string, MapLayout> = {
	forest_gate: FOREST_GATE_MAP,
	lava_fortress: LAVA_FORTRESS_MAP,
	storm_citadel: STORM_CITADEL_MAP,
};

export const DEFAULT_MAP_ID = 'forest_gate';

export function getMapById(mapId: string): MapLayout {
	const map = _getMapById(mapId);
	if (!map) throw new Error(`Unknown map ID: ${mapId}`);
	return map;
}

export function isMapUnlocked(map: MapLayout, playerLevel: number): boolean {
	return map.unlockLevel === undefined || playerLevel >= map.unlockLevel;
}

export function getSpawnExitPairs(
	map: MapLayout,
): Array<{ spawn: Position; exit: Position }> {
	const paths = getMapPaths(map);
	return paths
		.filter((lane) => lane.length >= 2)
		.map((lane) => ({
			spawn: lane[0],
			exit: lane[lane.length - 1],
		}));
}
