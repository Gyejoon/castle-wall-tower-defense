import type { Position, Tile, Grid, GridConfig } from '@gld/shared';
import { TILE_SIZE, DEFAULT_GRID_CONFIG } from '@gld/shared';

export class GridManager {
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;
  readonly spawnPoint: Position;
  readonly exitPoint: Position;
  private grid: Grid;

  constructor(config: GridConfig = DEFAULT_GRID_CONFIG) {
    this.width = config.width;
    this.height = config.height;
    this.tileSize = TILE_SIZE;
    this.spawnPoint = config.spawnPoint;
    this.exitPoint = config.exitPoint;
    this.grid = this.createGrid();
  }

  private createGrid(): Grid {
    const grid: Grid = [];
    for (let y = 0; y < this.height; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < this.width; x++) {
        row.push({
          position: { x, y },
          walkable: true,
          occupied: false,
          towerId: null,
        });
      }
      grid.push(row);
    }
    return grid;
  }

  getTile(x: number, y: number): Tile | null {
    if (!this.isInBounds(x, y)) return null;
    return this.grid[y][x];
  }

  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile !== null && tile.walkable && !tile.occupied;
  }

  placeTower(x: number, y: number, towerId: string): boolean {
    const tile = this.getTile(x, y);
    if (!tile || !tile.walkable || tile.occupied) return false;
    if (x === this.spawnPoint.x && y === this.spawnPoint.y) return false;
    if (x === this.exitPoint.x && y === this.exitPoint.y) return false;

    tile.occupied = true;
    tile.towerId = towerId;
    return true;
  }

  removeTower(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    if (!tile || !tile.occupied) return false;

    tile.occupied = false;
    tile.towerId = null;
    return true;
  }

  /** Convert grid coords to world pixel coords (center of tile) */
  gridToWorld(gridX: number, gridY: number): Position {
    return {
      x: gridX * this.tileSize + this.tileSize / 2,
      y: gridY * this.tileSize + this.tileSize / 2,
    };
  }

  /** Convert world pixel coords to grid coords */
  worldToGrid(worldX: number, worldY: number): Position {
    return {
      x: Math.floor(worldX / this.tileSize),
      y: Math.floor(worldY / this.tileSize),
    };
  }

  /** Get a 2D walkability array for pathfinding */
  getWalkabilityGrid(): number[][] {
    return this.grid.map((row) =>
      row.map((tile) => (tile.walkable && !tile.occupied ? 0 : 1)),
    );
  }
}
