import type { MapLayout } from '../types/map';

function buildForestCanyonPath(): Array<{ x: number; y: number }> {
	return [
		{ x: 0, y: 6 },
		{ x: 1, y: 6 },
		{ x: 2, y: 6 },
		{ x: 2, y: 5 },
		{ x: 2, y: 4 },
		{ x: 3, y: 4 },
		{ x: 4, y: 4 },
		{ x: 5, y: 4 },
		{ x: 5, y: 3 },
		{ x: 5, y: 2 },
		{ x: 6, y: 2 },
		{ x: 7, y: 2 },
		{ x: 8, y: 2 },
		{ x: 8, y: 3 },
		{ x: 8, y: 4 },
		{ x: 9, y: 4 },
		{ x: 10, y: 4 },
		{ x: 11, y: 4 },
	];
}

const FOREST_CANYON_PLACEMENT_POINTS: Array<{ x: number; y: number }> = [
	{ x: 0, y: 5 },
	{ x: 1, y: 5 },
	{ x: 1, y: 4 },
	{ x: 3, y: 5 },
	{ x: 3, y: 3 },
	{ x: 4, y: 3 },
	{ x: 4, y: 5 },
	{ x: 6, y: 4 },
	{ x: 6, y: 3 },
	{ x: 7, y: 3 },
	{ x: 7, y: 1 },
	{ x: 8, y: 1 },
	{ x: 9, y: 2 },
	{ x: 9, y: 5 },
	{ x: 10, y: 3 },
];

export const FOREST_GATE_MAP: MapLayout = {
	id: 'forest-gate',
	name: 'Forest Gate',
	width: 12,
	height: 8,
	tileSize: 32,
	path: buildForestCanyonPath(),
	placementPoints: FOREST_CANYON_PLACEMENT_POINTS,
	spawnPoint: { x: 0, y: 6 },
	exitPoint: { x: 11, y: 4 },
	tilemapKey: 'tilemap-forest-gate',
	tilesetKey: 'tileset',
};
