import type { MapLayout } from '../types/map';

// Forest Gate map path:
// Spawn (0,3) → east to (17,3) → south to (17,10) → west to (3,10) → south to (3,17) → east to Exit (19,17)

function buildForestGatePath(): Array<{ x: number; y: number }> {
  const path: Array<{ x: number; y: number }> = [];

  // Segment 1: Spawn (0,3) → east to (17,3)
  for (let x = 0; x <= 17; x++) {
    path.push({ x, y: 3 });
  }

  // Segment 2: south from (17,3) to (17,10) — skip (17,3) already added
  for (let y = 4; y <= 10; y++) {
    path.push({ x: 17, y });
  }

  // Segment 3: west from (17,10) to (3,10) — skip (17,10) already added
  for (let x = 16; x >= 3; x--) {
    path.push({ x, y: 10 });
  }

  // Segment 4: south from (3,10) to (3,17) — skip (3,10) already added
  for (let y = 11; y <= 17; y++) {
    path.push({ x: 3, y });
  }

  // Segment 5: east from (3,17) to Exit (19,17) — skip (3,17) already added
  for (let x = 4; x <= 19; x++) {
    path.push({ x, y: 17 });
  }

  return path;
}

// 17 placement points distributed near bends and strategic positions along the path.
// Rules: not on path, adjacent (N/S/E/W) to at least one path tile, within 0-19.
const FOREST_GATE_PLACEMENT_POINTS: Array<{ x: number; y: number }> = [
  // Above segment 1 (y=3), northern side
  { x: 2, y: 2 },   // above (2,3)
  { x: 6, y: 2 },   // above (6,3)
  { x: 10, y: 2 },  // above (10,3)
  { x: 14, y: 2 },  // above (14,3)
  { x: 17, y: 2 },  // above corner (17,3)

  // Right of segment 2 (x=17), eastern side
  { x: 18, y: 5 },  // right of (17,5)
  { x: 18, y: 8 },  // right of (17,8)
  { x: 18, y: 10 }, // right of (17,10) corner

  // Below segment 3 (y=10), southern side
  { x: 14, y: 11 }, // below (14,10)
  { x: 10, y: 11 }, // below (10,10)
  { x: 6, y: 11 },  // below (6,10)
  { x: 3, y: 9 },   // above corner (3,10)

  // Left of segment 4 (x=3), western side
  { x: 2, y: 12 },  // left of (3,12)
  { x: 2, y: 15 },  // left of (3,15)

  // Above/below segment 5 (y=17), southern bend area
  { x: 7, y: 16 },  // above (7,17)
  { x: 12, y: 16 }, // above (12,17)
  { x: 16, y: 16 }, // above (16,17)
];

export const FOREST_GATE_MAP: MapLayout = {
  id: 'forest-gate',
  name: 'Forest Gate',
  width: 20,
  height: 20,
  tileSize: 32,
  path: buildForestGatePath(),
  placementPoints: FOREST_GATE_PLACEMENT_POINTS,
  spawnPoint: { x: 0, y: 3 },
  exitPoint: { x: 19, y: 17 },
  tilemapKey: 'tilemap-forest-gate',
  tilesetKey: 'tileset-forest',
};

export const DEFAULT_MAP = FOREST_GATE_MAP;
