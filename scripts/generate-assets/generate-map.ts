import { writeFileSync, mkdirSync } from 'fs';
import { FOREST_GATE_MAP } from '../../packages/shared/src/index';
import type { ManifestEntry } from './shared';
import { TILESET_COLS, TILESET_ROWS, TILE as TILESET_TILE } from './generate-tileset';

const OUTPUT_PATH = 'packages/web-shell/public/assets/maps/forest-gate.json';

// GID constants (1-based: tile index + 1)
const GID = {
  EMPTY:           0,
  GRASS_LIGHT:     1,  // index 0
  GRASS_DARK:      2,  // index 1
  PATH_H:          3,  // index 2
  PATH_V:          4,  // index 3
  PATH_CORNER_NE:  5,  // index 4
  PATH_CORNER_NW:  6,  // index 5
  PATH_CORNER_SE:  7,  // index 6
  PATH_CORNER_SW:  8,  // index 7
  PATH_SPAWN:      9,  // index 8
  PATH_EXIT:       10, // index 9
  TREE_SMALL:      11, // index 10
  TREE_LARGE:      12, // index 11
  ROCK_SMALL:      13, // index 12
  ROCK_LARGE:      14, // index 13
  BUSH:            15, // index 14
  FLOWERS:         16, // index 15
  PLACEMENT_POINT: 17, // index 16
  WATER:           18, // index 17
  BRIDGE_H:        19, // index 18
  BRIDGE_V:        20, // index 19
  EDGE_N:          21, // index 20
  EDGE_S:          22, // index 21
  EDGE_E:          23, // index 22
  EDGE_W:          24, // index 23
} as const;

interface TiledMap {
  width: number;
  height: number;
  tilewidth: number;
  tileheight: number;
  orientation: string;
  renderorder: string;
  type: string;
  version: string;
  tiledversion: string;
  tilesets: TiledTileset[];
  layers: TiledLayer[];
}

interface TiledTileset {
  firstgid: number;
  name: string;
  image: string;
  imagewidth: number;
  imageheight: number;
  tilewidth: number;
  tileheight: number;
  tilecount: number;
  columns: number;
  margin: number;
  spacing: number;
}

interface TiledTileLayer {
  name: string;
  type: 'tilelayer';
  width: number;
  height: number;
  data: number[];
  visible: boolean;
  opacity: number;
  x: number;
  y: number;
}

interface TiledObject {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TiledObjectLayer {
  name: string;
  type: 'objectgroup';
  objects: TiledObject[];
  visible: boolean;
  opacity: number;
  x: number;
  y: number;
}

type TiledLayer = TiledTileLayer | TiledObjectLayer;

function makeEmptyLayer(width: number, height: number): number[] {
  return new Array<number>(width * height).fill(GID.EMPTY);
}

function cellIndex(x: number, y: number, width: number): number {
  return y * width + x;
}

// Determine which direction the path is traveling at each step
type Dir = 'east' | 'west' | 'north' | 'south';

function getDir(from: { x: number; y: number }, to: { x: number; y: number }): Dir {
  if (to.x > from.x) return 'east';
  if (to.x < from.x) return 'west';
  if (to.y > from.y) return 'south';
  return 'north';
}

export async function generateMap(): Promise<ManifestEntry[]> {
  const map = FOREST_GATE_MAP;
  const { width, height, tileSize, path, placementPoints, spawnPoint, exitPoint } = map;

  const pathSet = new Set<string>(path.map(p => `${p.x},${p.y}`));
  const placementSet = new Set<string>(placementPoints.map(p => `${p.x},${p.y}`));

  // === Ground layer: checkerboard of grass-light and grass-dark ===
  const groundData = makeEmptyLayer(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const isLight = (x + y) % 2 === 0;
      groundData[cellIndex(x, y, width)] = isLight ? GID.GRASS_LIGHT : GID.GRASS_DARK;
    }
  }

  // === Path layer ===
  const pathData = makeEmptyLayer(width, height);

  // Build direction map for each path tile
  const dirMap = new Map<string, { incoming: Dir | null; outgoing: Dir | null }>();

  for (let i = 0; i < path.length; i++) {
    const cur = path[i];
    const prev = path[i - 1] ?? null;
    const next = path[i + 1] ?? null;
    const key = `${cur.x},${cur.y}`;

    const incoming: Dir | null = prev ? getDir(prev, cur) : null;
    const outgoing: Dir | null = next ? getDir(cur, next) : null;
    dirMap.set(key, { incoming, outgoing });
  }

  for (let i = 0; i < path.length; i++) {
    const tile = path[i];
    const key = `${tile.x},${tile.y}`;
    const dirs = dirMap.get(key)!;
    const { incoming, outgoing } = dirs;

    let gid: number;

    const isSpawn = tile.x === spawnPoint.x && tile.y === spawnPoint.y;
    const isExit = tile.x === exitPoint.x && tile.y === exitPoint.y;

    if (isSpawn) {
      gid = GID.PATH_SPAWN;
    } else if (isExit) {
      gid = GID.PATH_EXIT;
    } else if (incoming === null || outgoing === null) {
      // Terminal tile — default to horizontal
      gid = GID.PATH_H;
    } else if (incoming === outgoing) {
      // Straight segment
      if (incoming === 'east' || incoming === 'west') {
        gid = GID.PATH_H;
      } else {
        gid = GID.PATH_V;
      }
    } else {
      // Corner — map (incoming, outgoing) combinations
      // incoming=east means we arrived from west going east; the corner then turns
      const key2 = `${incoming}-${outgoing}`;
      switch (key2) {
        case 'east-south':  gid = GID.PATH_CORNER_SE; break; // going east then turning south
        case 'east-north':  gid = GID.PATH_CORNER_NE; break;
        case 'west-south':  gid = GID.PATH_CORNER_SW; break;
        case 'west-north':  gid = GID.PATH_CORNER_NW; break;
        case 'south-east':  gid = GID.PATH_CORNER_SE; break;
        case 'south-west':  gid = GID.PATH_CORNER_SW; break;
        case 'north-east':  gid = GID.PATH_CORNER_NE; break;
        case 'north-west':  gid = GID.PATH_CORNER_NW; break;
        default:            gid = GID.PATH_H;
      }
    }

    pathData[cellIndex(tile.x, tile.y, width)] = gid;
  }

  // === Decoration layer: sparse scatter of trees/rocks/bushes ===
  const decorData = makeEmptyLayer(width, height);

  const decorOptions = [
    GID.TREE_SMALL, GID.TREE_SMALL, GID.TREE_SMALL,
    GID.TREE_LARGE,
    GID.ROCK_SMALL, GID.ROCK_SMALL,
    GID.ROCK_LARGE,
    GID.BUSH, GID.BUSH,
    GID.FLOWERS, GID.FLOWERS,
  ];

  // Deterministic pseudo-random scatter — avoid path and placement cells
  let count = 0;
  const maxDecorations = 25;
  // Walk a fixed pattern of candidate positions
  const candidates: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const k = `${x},${y}`;
      if (!pathSet.has(k) && !placementSet.has(k)) {
        candidates.push({ x, y });
      }
    }
  }

  // Pick every Nth candidate deterministically
  const step = Math.floor(candidates.length / maxDecorations);
  for (let i = 0; i < candidates.length && count < maxDecorations; i += step) {
    const c = candidates[i];
    const decorIdx = count % decorOptions.length;
    decorData[cellIndex(c.x, c.y, width)] = decorOptions[decorIdx];
    count++;
  }

  // === Objects layer: placement points ===
  const objects: TiledObject[] = placementPoints.map((pp, index) => ({
    id: index + 1,
    name: `pp_${index}`,
    type: 'placement_point',
    x: pp.x * tileSize,
    y: pp.y * tileSize,
    width: tileSize,
    height: tileSize,
  }));

  // === Assemble Tiled JSON ===
  const tiledMap: TiledMap = {
    width,
    height,
    tilewidth: tileSize,
    tileheight: tileSize,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    type: 'map',
    version: '1.10',
    tiledversion: '1.10.2',
    tilesets: [{
      firstgid: 1,
      name: 'tileset',
      image: '../tileset.png',
      imagewidth: TILESET_COLS * TILESET_TILE,
      imageheight: TILESET_ROWS * TILESET_TILE,
      tilewidth: tileSize,
      tileheight: tileSize,
      tilecount: TILESET_COLS * TILESET_ROWS,
      columns: TILESET_COLS,
      margin: 0,
      spacing: 0,
    }],
    layers: [
      {
        name: 'ground',
        type: 'tilelayer',
        width,
        height,
        data: groundData,
        visible: true,
        opacity: 1,
        x: 0,
        y: 0,
      },
      {
        name: 'path',
        type: 'tilelayer',
        width,
        height,
        data: pathData,
        visible: true,
        opacity: 1,
        x: 0,
        y: 0,
      },
      {
        name: 'decoration',
        type: 'tilelayer',
        width,
        height,
        data: decorData,
        visible: true,
        opacity: 1,
        x: 0,
        y: 0,
      },
      {
        name: 'objects',
        type: 'objectgroup',
        objects,
        visible: true,
        opacity: 1,
        x: 0,
        y: 0,
      },
    ],
  };

  mkdirSync('packages/web-shell/public/assets/maps', { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify(tiledMap, null, 2));
  console.log(`  wrote ${OUTPUT_PATH}`);

  return [{
    key: 'tilemap-forest-gate',
    type: 'image',
    path: 'assets/maps/forest-gate.json',
  }];
}

if (import.meta.main) {
  generateMap().then(e => console.log(JSON.stringify(e, null, 2)));
}
