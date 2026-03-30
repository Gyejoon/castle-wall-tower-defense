import type { MapLayout } from '../types/map';

// Palace map path for 12×8 grid:
// Spawn (0,4) → east to (4,4) → north to (4,1) → east to (8,1) → south to (8,6) → east to Exit (11,6)

function buildPalacePath(): Array<{ x: number; y: number }> {
  const path: Array<{ x: number; y: number }> = [];

  // Segment 1: Spawn (0,4) → east to (4,4)
  for (let x = 0; x <= 4; x++) {
    path.push({ x, y: 4 });
  }

  // Segment 2: north from (4,4) to (4,1)
  for (let y = 3; y >= 1; y--) {
    path.push({ x: 4, y });
  }

  // Segment 3: east from (4,1) to (8,1)
  for (let x = 5; x <= 8; x++) {
    path.push({ x, y: 1 });
  }

  // Segment 4: south from (8,1) to (8,6)
  for (let y = 2; y <= 6; y++) {
    path.push({ x: 8, y });
  }

  // Segment 5: east from (8,6) to Exit (11,6)
  for (let x = 9; x <= 11; x++) {
    path.push({ x, y: 6 });
  }

  return path;
}

// Placement points: adjacent to path, not on path, within 12×8 bounds
const PALACE_PLACEMENT_POINTS: Array<{ x: number; y: number }> = [
  // Along segment 1 (y=4)
  { x: 1, y: 3 },
  { x: 2, y: 5 },
  { x: 3, y: 3 },

  // Near bend (4,4)→(4,1)
  { x: 5, y: 4 },
  { x: 3, y: 2 },
  { x: 5, y: 2 },

  // Along segment 3 (y=1)
  { x: 5, y: 0 },
  { x: 7, y: 0 },
  { x: 7, y: 2 },

  // Near bend (8,1)→(8,6)
  { x: 9, y: 1 },
  { x: 9, y: 3 },
  { x: 7, y: 4 },
  { x: 9, y: 5 },

  // Along segment 5 (y=6)
  { x: 10, y: 5 },
  { x: 10, y: 7 },
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
  exitPoint: { x: 11, y: 6 },
  tilemapKey: 'tilemap-palace',
  tilesetKey: 'tileset-palace',
};

export const DEFAULT_MAP = FOREST_GATE_MAP;
