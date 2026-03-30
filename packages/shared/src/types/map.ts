import type { Position } from './grid';

export interface MapLayout {
  id: string;
  name: string;
  width: number;           // grid units (20)
  height: number;          // grid units (20)
  tileSize: number;        // pixels (32)
  path: Position[];        // ordered tiles from spawn to exit (every walkable tile along the route)
  placementPoints: Position[];  // where towers can be placed (17 points)
  spawnPoint: Position;
  exitPoint: Position;
  tilemapKey: string;      // Phaser cache key for tilemap JSON
  tilesetKey: string;      // Phaser cache key for tileset image
}
