import { TERRAIN_BUILDABLE } from '../constants/terrain';
import type { Position } from '../types/grid';
import type { MapLayout } from '../types/map';
import forestGateRaw from './forest-gate.tmj.json';
import lavaFortressRaw from './lava-fortress.tmj.json';
import { parseTiledMap, type TiledRawMap } from './parseTiledMap';
import stormCitadelRaw from './storm-citadel.tmj.json';

/**
 * When the .tmj.json has no explicit placement_point objects, derive
 * buildablePoints from the terrain grid (any cell whose terrain is
 * buildable AND is not already in blockedPlacementPoints).
 */
function backfillBuildablePoints(map: MapLayout): MapLayout {
	if (map.buildablePoints.length > 0) return map;
	const blockedSet = new Set(
		map.blockedPlacementPoints.map((p) => `${p.x},${p.y}`),
	);
	const buildablePoints: Position[] = [];
	for (let y = 0; y < map.height; y++) {
		for (let x = 0; x < map.width; x++) {
			if (blockedSet.has(`${x},${y}`)) continue;
			const terrain = map.terrain?.[y]?.[x];
			if (terrain && TERRAIN_BUILDABLE[terrain]) {
				buildablePoints.push({ x, y });
			}
		}
	}
	return { ...map, buildablePoints };
}

export const FOREST_GATE_MAP: MapLayout = backfillBuildablePoints(
	parseTiledMap(forestGateRaw as unknown as TiledRawMap),
);
export const LAVA_FORTRESS_MAP: MapLayout = backfillBuildablePoints(
	parseTiledMap(lavaFortressRaw as unknown as TiledRawMap),
);
export const STORM_CITADEL_MAP: MapLayout = backfillBuildablePoints(
	parseTiledMap(stormCitadelRaw as unknown as TiledRawMap),
);

export const ALL_MAPS: MapLayout[] = [
	FOREST_GATE_MAP,
	LAVA_FORTRESS_MAP,
	STORM_CITADEL_MAP,
];

export function getMapById(id: string): MapLayout | undefined {
	return ALL_MAPS.find((m) => m.id === id);
}

export function getMapPaths(map: MapLayout): Position[][] {
	return map.paths ?? [map.path];
}

export function getAllPathCells(map: MapLayout): Position[] {
	const paths = getMapPaths(map);
	if (paths.length === 1) return paths[0];
	const seen = new Set<string>();
	const cells: Position[] = [];
	for (const lane of paths) {
		for (const c of lane) {
			const k = `${c.x},${c.y}`;
			if (!seen.has(k)) {
				seen.add(k);
				cells.push(c);
			}
		}
	}
	return cells;
}
