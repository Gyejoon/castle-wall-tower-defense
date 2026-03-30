import type { MapLayout } from '../types/map';

// Palace map path for 12×8 grid:
// Spawn (0,4) → Exit (11,4) straight left-to-right per spec 6.2

function buildPalacePath(): Array<{ x: number; y: number }> {
  return Array.from({ length: 12 }, (_, x) => ({ x, y: 4 }));
}

// Placement points: adjacent to path, not on path, within 12×8 bounds
const PALACE_PLACEMENT_POINTS: Array<{ x: number; y: number }> = [
  { x: 1, y: 3 },
  { x: 1, y: 5 },
  { x: 2, y: 3 },
  { x: 2, y: 5 },
  { x: 3, y: 3 },
  { x: 4, y: 5 },
  { x: 5, y: 3 },
  { x: 5, y: 5 },
  { x: 6, y: 3 },
  { x: 6, y: 5 },
  { x: 7, y: 3 },
  { x: 8, y: 5 },
  { x: 9, y: 3 },
  { x: 9, y: 5 },
  { x: 10, y: 3 },
];

export const FOREST_GATE_MAP: MapLayout = {
  id: 'palace',
  name: 'Palace',
  width: 12,
  height: 8,
  tileSize: 32,
  path: buildPalacePath(),
  placementPoints: PALACE_PLACEMENT_POINTS,
  spawnPoint: { x: 0, y: 4 },
  exitPoint: { x: 11, y: 4 },
  tilemapKey: 'tilemap-palace',
  tilesetKey: 'tileset-palace',
};
