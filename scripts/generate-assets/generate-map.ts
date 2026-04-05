import { mkdirSync, writeFileSync } from 'fs';
import { FOREST_GATE_MAP, LAVA_FORTRESS_MAP, STORM_CITADEL_MAP, getAllPathCells, getMapPaths } from '../../packages/shared/src/index';
import type { MapLayout } from '../../packages/shared/src/types/map';
import {
  TINY_SWORDS_DECORATION_ASSETS,
  TINY_SWORDS_PRIMARY_TILESET,
  TINY_SWORDS_TILE_SIZE,
  type TinySwordsDecorationAssetEntry,
} from '../../packages/phaser-game/src/fieldAssets';
import type { ManifestEntry } from './shared';

const OUTPUT_PATH = 'packages/web-shell/public/assets/maps/forest-gate.json';

const GID = {
  EMPTY: 0,
  GROUND_LIGHT: 1,
  GROUND_DARK: 2,
  PATH: 3,
  PATH_CORNER: 4,
  PATH_SPAWN: 5,
  PATH_EXIT: 6,
} as const;

type Cell = { x: number; y: number };

interface TiledProperty {
  name: string;
  type: 'string' | 'int' | 'bool';
  value: string | number | boolean;
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
  properties?: TiledProperty[];
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
  layers: Array<TiledTileLayer | TiledObjectLayer>;
}

interface DecorCandidate extends Cell {
  distanceToPath: number;
  nearestPathIndex: number;
  isOuterCorner: boolean;
  isEdge: boolean;
}

function makeEmptyLayer(width: number, height: number): number[] {
  return new Array<number>(width * height).fill(GID.EMPTY);
}

function cellIndex(x: number, y: number, width: number): number {
  return y * width + x;
}

function keyOf(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}

function manhattan(a: Cell, b: Cell): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function isInBounds(cell: Cell, width: number, height: number): boolean {
  return cell.x >= 0 && cell.x < width && cell.y >= 0 && cell.y < height;
}

function countTurns(path: Cell[]): number {
  let turns = 0;
  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const current = path[i];
    const next = path[i + 1];
    const dx1 = current.x - prev.x;
    const dy1 = current.y - prev.y;
    const dx2 = next.x - current.x;
    const dy2 = next.y - current.y;
    if (dx1 !== dx2 || dy1 !== dy2) {
      turns++;
    }
  }
  return turns;
}

function getNearestPathMeta(cell: Cell, path: Cell[]): { distance: number; index: number } {
  let distance = Number.POSITIVE_INFINITY;
  let index = -1;

  for (let i = 0; i < path.length; i++) {
    const currentDistance = manhattan(cell, path[i]);
    if (currentDistance < distance) {
      distance = currentDistance;
      index = i;
    }
  }

  return { distance, index };
}

function buildAdjacencyProtection(cells: Cell[], width: number, height: number): Set<string> {
  const protectedCells = new Set<string>();
  for (const anchor of cells) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cell = { x: anchor.x + dx, y: anchor.y + dy };
        if (isInBounds(cell, width, height)) {
          protectedCells.add(keyOf(cell));
        }
      }
    }
  }
  return protectedCells;
}

function collectOuterCornerCells(path: Cell[], width: number, height: number): Set<string> {
  const outerCorners = new Set<string>();

  for (let i = 1; i < path.length - 1; i++) {
    const prev = path[i - 1];
    const current = path[i];
    const next = path[i + 1];
    const dx1 = current.x - prev.x;
    const dy1 = current.y - prev.y;
    const dx2 = next.x - current.x;
    const dy2 = next.y - current.y;
    if (dx1 === dx2 && dy1 === dy2) continue;

    const outer = {
      x: current.x - Math.sign(dx1 + dx2),
      y: current.y - Math.sign(dy1 + dy2),
    };

    if (isInBounds(outer, width, height)) {
      outerCorners.add(keyOf(outer));
    }
  }

  return outerCorners;
}

function hasNeighbor(cell: Cell, occupied: Set<string>): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (occupied.has(keyOf({ x: cell.x + dx, y: cell.y + dy }))) {
        return true;
      }
    }
  }
  return false;
}

function buildDecorationProperties(asset: TinySwordsDecorationAssetEntry): TiledProperty[] {
  return [
    { name: 'kind', type: 'string', value: asset.kind },
    { name: 'assetKey', type: 'string', value: asset.key },
    { name: 'variant', type: 'string', value: asset.variant },
  ];
}

function assertPathLayerContract(
  pathData: number[],
  path: Cell[],
  width: number,
  spawnPoint: Cell,
  exitPoint: Cell,
): void {
  const nonEmptyPathCount = pathData.filter((gid) => gid !== GID.EMPTY).length;
  if (nonEmptyPathCount !== path.length) {
    throw new Error(`[map] path layer mismatch: expected ${path.length} walkable tiles, got ${nonEmptyPathCount}`);
  }

  const cornerCount = pathData.filter((gid) => gid === GID.PATH_CORNER).length;
  if (cornerCount !== countTurns(path)) {
    throw new Error('[map] path layer corner count no longer matches FOREST_GATE_MAP.path');
  }

  if (pathData[cellIndex(spawnPoint.x, spawnPoint.y, width)] !== GID.PATH_SPAWN) {
    throw new Error('[map] spawn tile contract drifted');
  }

  if (pathData[cellIndex(exitPoint.x, exitPoint.y, width)] !== GID.PATH_EXIT) {
    throw new Error('[map] exit tile contract drifted');
  }
}

function assertDecorationContract(
  decorationObjects: TiledObject[],
  width: number,
  height: number,
): void {
  if (decorationObjects.length === 0) {
    throw new Error('[map] decoration contract is empty');
  }

  for (const object of decorationObjects) {
    if (!object.properties?.some((property) => property.name === 'assetKey')) {
      throw new Error(`[map] decoration ${object.name} is missing assetKey metadata`);
    }
    if (!object.properties?.some((property) => property.name === 'variant')) {
      throw new Error(`[map] decoration ${object.name} is missing variant metadata`);
    }
  }

  for (const object of decorationObjects) {
    const cell = { x: Math.round(object.x / 32), y: Math.round(object.y / 32) };
    if (!isInBounds(cell, width, height)) {
      throw new Error(`[map] decoration ${object.name} is out of bounds`);
    }
  }
}

export async function generateMap(): Promise<ManifestEntry[]> {
  const map = FOREST_GATE_MAP;
  const { width, height, tileSize, path, buildablePoints, spawnPoint, exitPoint } = map;

  const pathSet = new Set<string>(path.map((point) => keyOf(point)));
  const pathProtection = pathSet;
  const pathAdjacencyProtection = buildAdjacencyProtection(path, width, height);
  const landmarkProtection = buildAdjacencyProtection([spawnPoint, exitPoint], width, height);
  const outerCorners = collectOuterCornerCells(path, width, height);

  const groundData = makeEmptyLayer(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      groundData[cellIndex(x, y, width)] = (x + y) % 2 === 0
        ? GID.GROUND_LIGHT
        : GID.GROUND_DARK;
    }
  }

  const pathData = makeEmptyLayer(width, height);
  for (let i = 0; i < path.length; i++) {
    const current = path[i];
    const previous = path[i - 1];
    const next = path[i + 1];

    let gid = GID.PATH;
    if (current.x === spawnPoint.x && current.y === spawnPoint.y) {
      gid = GID.PATH_SPAWN;
    } else if (current.x === exitPoint.x && current.y === exitPoint.y) {
      gid = GID.PATH_EXIT;
    } else if (previous && next) {
      const dx1 = current.x - previous.x;
      const dy1 = current.y - previous.y;
      const dx2 = next.x - current.x;
      const dy2 = next.y - current.y;
      if (dx1 !== dx2 || dy1 !== dy2) {
        gid = GID.PATH_CORNER;
      }
    }

    pathData[cellIndex(current.x, current.y, width)] = gid;
  }

  assertPathLayerContract(pathData, path, width, spawnPoint, exitPoint);

  const candidates: DecorCandidate[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = { x, y };
      const key = keyOf(cell);
      if (pathProtection.has(key)) continue;

      const nearest = getNearestPathMeta(cell, path);
      candidates.push({
        ...cell,
        distanceToPath: nearest.distance,
        nearestPathIndex: nearest.index,
        isOuterCorner: outerCorners.has(key),
        isEdge: x === 0 || x === width - 1 || y === 0 || y === height - 1,
      });
    }
  }

  const occupied = new Set<string>();
  const decorationObjects: TiledObject[] = [];
  let nextObjectId = 10_000;

  const largePool = TINY_SWORDS_DECORATION_ASSETS.filter((asset) => asset.size === 'large');
  const edgePool = TINY_SWORDS_DECORATION_ASSETS.filter((asset) =>
    asset.kind === 'tree_large' || asset.kind === 'rock_large'
  );
  const smallPool = TINY_SWORDS_DECORATION_ASSETS.filter((asset) => asset.size === 'small');

  const canPlaceDecor = (cell: Cell, asset: TinySwordsDecorationAssetEntry): boolean => {
    const key = keyOf(cell);
    if (occupied.has(key)) return false;
    if (pathProtection.has(key) || landmarkProtection.has(key)) return false;
    if (asset.size === 'large' && pathAdjacencyProtection.has(key)) {
      return false;
    }
    return true;
  };

  const placeDecor = (cell: Cell, asset: TinySwordsDecorationAssetEntry): boolean => {
    if (!canPlaceDecor(cell, asset)) return false;

    occupied.add(keyOf(cell));
    decorationObjects.push({
      id: nextObjectId++,
      name: `decor_${decorationObjects.length}`,
      type: 'decoration',
      x: cell.x * tileSize,
      y: cell.y * tileSize,
      width: tileSize,
      height: tileSize,
      properties: buildDecorationProperties(asset),
    });
    return true;
  };

  const placeCluster = (seed: DecorCandidate, rootAsset: TinySwordsDecorationAssetEntry) => {
    if (!placeDecor(seed, rootAsset)) return;

    const offsets = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
    ];
    let placedNeighbors = 0;
    for (const [index, offset] of offsets.entries()) {
      const neighbor = { x: seed.x + offset.x, y: seed.y + offset.y };
      if (!isInBounds(neighbor, width, height) || hasNeighbor(neighbor, occupied)) continue;
      const asset = smallPool[(seed.nearestPathIndex + index + seed.x + seed.y) % smallPool.length];
      if (placeDecor(neighbor, asset)) {
        placedNeighbors++;
      }
      if (placedNeighbors >= 2) break;
    }
  };

  const outerCornerSeeds = candidates
    .filter((candidate) => candidate.isOuterCorner && candidate.distanceToPath >= 2)
    .sort((a, b) => a.nearestPathIndex - b.nearestPathIndex);
  for (const seed of outerCornerSeeds) {
    const asset = largePool[(seed.nearestPathIndex + seed.x + seed.y) % largePool.length];
    placeCluster(seed, asset);
  }

  const edgeSeeds = candidates
    .filter((candidate) => candidate.isEdge && candidate.distanceToPath >= 2)
    .filter((candidate) => (candidate.x * 3 + candidate.y * 5 + candidate.nearestPathIndex) % 4 === 0)
    .sort((a, b) => a.nearestPathIndex - b.nearestPathIndex);
  for (const seed of edgeSeeds) {
    const asset = edgePool[(seed.nearestPathIndex + seed.x) % edgePool.length];
    placeCluster(seed, asset);
  }

  const farSeeds = candidates
    .filter((candidate) => candidate.distanceToPath >= 3 && !candidate.isEdge && !candidate.isOuterCorner)
    .filter((candidate) => (candidate.x * 7 + candidate.y * 11 + candidate.nearestPathIndex) % 5 === 0)
    .sort((a, b) => a.nearestPathIndex - b.nearestPathIndex);
  for (const seed of farSeeds) {
    const asset = TINY_SWORDS_DECORATION_ASSETS[
      (seed.nearestPathIndex + seed.x + seed.y) % TINY_SWORDS_DECORATION_ASSETS.length
    ];
    if (asset.size === 'large') {
      placeCluster(seed, asset);
    } else {
      placeDecor(seed, asset);
    }
  }

  const bufferSeeds = candidates
    .filter((candidate) => candidate.distanceToPath === 2)
    .filter((candidate) => (candidate.x + candidate.y + candidate.nearestPathIndex) % 6 === 0);
  for (const seed of bufferSeeds) {
    const asset = smallPool[(seed.nearestPathIndex + seed.x) % smallPool.length];
    if (!hasNeighbor(seed, occupied)) {
      placeDecor(seed, asset);
    }
  }

  assertDecorationContract(decorationObjects, width, height);

  const placementObjects: TiledObject[] = buildablePoints.map((point, index) => ({
    id: index + 1,
    name: `pp_${index}`,
    type: 'placement_point',
    x: point.x * tileSize,
    y: point.y * tileSize,
    width: tileSize,
    height: tileSize,
  }));

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
    tilesets: [
      {
        firstgid: 1,
        name: 'tiny-swords-primary-tileset',
        image: '../vendor/tiny-swords/terrain/tileset/Tilemap_color1.png',
        imagewidth: TINY_SWORDS_PRIMARY_TILESET.pixelWidth,
        imageheight: TINY_SWORDS_PRIMARY_TILESET.pixelHeight,
        tilewidth: TINY_SWORDS_TILE_SIZE,
        tileheight: TINY_SWORDS_TILE_SIZE,
        tilecount: TINY_SWORDS_PRIMARY_TILESET.frameCount,
        columns: TINY_SWORDS_PRIMARY_TILESET.pixelWidth / TINY_SWORDS_TILE_SIZE,
        margin: 0,
        spacing: 0,
      },
    ],
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
        name: 'decorations',
        type: 'objectgroup',
        objects: decorationObjects,
        visible: true,
        opacity: 1,
        x: 0,
        y: 0,
      },
      {
        name: 'objects',
        type: 'objectgroup',
        objects: placementObjects,
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

  const entries: ManifestEntry[] = [
    {
      key: 'tilemap-forest-gate',
      type: 'tilemapTiledJSON',
      path: 'assets/maps/forest-gate.json',
    },
  ];

  // Additional stage maps — real path data from map constants
  const ADDITIONAL_MAPS: MapLayout[] = [LAVA_FORTRESS_MAP, STORM_CITADEL_MAP];

  for (const stageMap of ADDITIONAL_MAPS) {
    const allPathCells = getAllPathCells(stageMap);
    const allPathSet = new Set<string>(allPathCells.map(p => keyOf(p)));
    const paths = getMapPaths(stageMap);

    // Build ground layer
    const stageGroundData = makeEmptyLayer(stageMap.width, stageMap.height);
    for (let y = 0; y < stageMap.height; y++) {
      for (let x = 0; x < stageMap.width; x++) {
        stageGroundData[cellIndex(x, y, stageMap.width)] = (x + y) % 2 === 0
          ? GID.GROUND_LIGHT
          : GID.GROUND_DARK;
      }
    }

    // Build path layer from all lanes
    const stagePathData = makeEmptyLayer(stageMap.width, stageMap.height);
    // Track spawn/exit points across all lanes
    const spawnSet = new Set<string>();
    const exitSet = new Set<string>();
    for (const lane of paths) {
      if (lane.length > 0) {
        spawnSet.add(keyOf(lane[0]));
        exitSet.add(keyOf(lane[lane.length - 1]));
      }
    }

    for (const lane of paths) {
      for (let i = 0; i < lane.length; i++) {
        const current = lane[i];
        const key = keyOf(current);
        const idx = cellIndex(current.x, current.y, stageMap.width);
        if (stagePathData[idx] !== GID.EMPTY) continue; // already set by another lane

        let gid = GID.PATH;
        if (spawnSet.has(key)) {
          gid = GID.PATH_SPAWN;
        } else if (exitSet.has(key)) {
          gid = GID.PATH_EXIT;
        } else if (i > 0 && i < lane.length - 1) {
          const prev = lane[i - 1];
          const next = lane[i + 1];
          const dx1 = current.x - prev.x;
          const dy1 = current.y - prev.y;
          const dx2 = next.x - current.x;
          const dy2 = next.y - current.y;
          if (dx1 !== dx2 || dy1 !== dy2) {
            gid = GID.PATH_CORNER;
          }
        }

        stagePathData[idx] = gid;
      }
    }

    // Build placement objects
    const stagePlacementObjects: TiledObject[] = stageMap.buildablePoints.map((point, index) => ({
      id: index + 1,
      name: `pp_${index}`,
      type: 'placement_point',
      x: point.x * stageMap.tileSize,
      y: point.y * stageMap.tileSize,
      width: stageMap.tileSize,
      height: stageMap.tileSize,
    }));

    // Build decorations for the stage
    const stageDecorObjects: TiledObject[] = [];
    let stageObjId = 10_000;
    const stagePathProtection = allPathSet;
    const stagePathAdjProtection = buildAdjacencyProtection(allPathCells, stageMap.width, stageMap.height);
    const stageLandmarkProtection = buildAdjacencyProtection(
      [...Array.from(spawnSet), ...Array.from(exitSet)].map(k => {
        const [x, y] = k.split(',').map(Number);
        return { x, y };
      }),
      stageMap.width,
      stageMap.height,
    );
    const stageOccupied = new Set<string>();

    // Place some decorations in non-path cells
    for (let y = 0; y < stageMap.height; y++) {
      for (let x = 0; x < stageMap.width; x++) {
        const cell = { x, y };
        const key = keyOf(cell);
        if (stagePathProtection.has(key) || stageLandmarkProtection.has(key)) continue;
        if (stagePathAdjProtection.has(key)) continue;
        if (stageOccupied.has(key)) continue;
        // Deterministic sparse placement
        if ((x * 7 + y * 11) % 5 !== 0) continue;

        const asset = smallPool[(x + y) % smallPool.length];
        stageOccupied.add(key);
        stageDecorObjects.push({
          id: stageObjId++,
          name: `decor_${stageDecorObjects.length}`,
          type: 'decoration',
          x: cell.x * stageMap.tileSize,
          y: cell.y * stageMap.tileSize,
          width: stageMap.tileSize,
          height: stageMap.tileSize,
          properties: buildDecorationProperties(asset),
        });
      }
    }

    const stageFileName = stageMap.id.replace('_', '-');
    const stageTiledMap: TiledMap = {
      width: stageMap.width,
      height: stageMap.height,
      tilewidth: stageMap.tileSize,
      tileheight: stageMap.tileSize,
      orientation: 'orthogonal',
      renderorder: 'right-down',
      type: 'map',
      version: '1.10',
      tiledversion: '1.10.2',
      tilesets: [
        {
          firstgid: 1,
          name: 'tiny-swords-primary-tileset',
          image: '../vendor/tiny-swords/terrain/tileset/Tilemap_color1.png',
          imagewidth: TINY_SWORDS_PRIMARY_TILESET.pixelWidth,
          imageheight: TINY_SWORDS_PRIMARY_TILESET.pixelHeight,
          tilewidth: TINY_SWORDS_TILE_SIZE,
          tileheight: TINY_SWORDS_TILE_SIZE,
          tilecount: TINY_SWORDS_PRIMARY_TILESET.frameCount,
          columns: TINY_SWORDS_PRIMARY_TILESET.pixelWidth / TINY_SWORDS_TILE_SIZE,
          margin: 0,
          spacing: 0,
        },
      ],
      layers: [
        {
          name: 'ground',
          type: 'tilelayer',
          width: stageMap.width,
          height: stageMap.height,
          data: stageGroundData,
          visible: true,
          opacity: 1,
          x: 0,
          y: 0,
        },
        {
          name: 'path',
          type: 'tilelayer',
          width: stageMap.width,
          height: stageMap.height,
          data: stagePathData,
          visible: true,
          opacity: 1,
          x: 0,
          y: 0,
        },
        {
          name: 'decorations',
          type: 'objectgroup',
          objects: stageDecorObjects,
          visible: true,
          opacity: 1,
          x: 0,
          y: 0,
        },
        {
          name: 'objects',
          type: 'objectgroup',
          objects: stagePlacementObjects,
          visible: true,
          opacity: 1,
          x: 0,
          y: 0,
        },
      ],
    };

    const mapFilePath = `packages/web-shell/public/assets/maps/${stageFileName}.json`;
    writeFileSync(mapFilePath, JSON.stringify(stageTiledMap, null, 2));
    console.log(`  wrote ${mapFilePath}`);
    entries.push({
      key: `tilemap-${stageMap.id.replace('_', '_')}`,
      type: 'tilemapTiledJSON',
      path: `assets/maps/${stageFileName}.json`,
    });
  }

  return entries;
}

if (import.meta.main) {
  generateMap().then((entries) => console.log(JSON.stringify(entries, null, 2)));
}
