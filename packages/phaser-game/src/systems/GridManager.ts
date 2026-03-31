import Phaser from 'phaser';
import type { Position, Tile, Grid, GridConfig } from '@gld/shared';
import { TILE_SIZE, DEFAULT_GRID_CONFIG, ISO_TILE_W, ISO_TILE_H, ISO_CANVAS_W, ISO_CANVAS_H } from '@gld/shared';

export class GridManager {
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;
  readonly spawnPoint: Position;
  readonly exitPoint: Position;
  private grid: Grid;
  private readonly offsetX: number;
  private readonly offsetY: number;

  constructor(config: GridConfig = DEFAULT_GRID_CONFIG) {
    this.width = config.width;
    this.height = config.height;
    this.tileSize = TILE_SIZE;
    this.spawnPoint = config.spawnPoint;
    this.exitPoint = config.exitPoint;

    // Center the isometric grid within the canvas.
    // The grid's world-space X range spans from gridToWorld(0, height-1).x to gridToWorld(width-1, 0).x
    // We compute offsets so the grid is centered in the canvas.
    const maxGx = this.width - 1;
    const maxGy = this.height - 1;
    // X extremes (before offset): (maxGx - 0) * halfW  and  (0 - maxGy) * halfW
    const xMin = -maxGy * (ISO_TILE_W / 2);
    const xMax = maxGx * (ISO_TILE_W / 2);
    this.offsetX = (ISO_CANVAS_W - (xMin + xMax)) / 2;
    // Y extremes (before offset): 0  and  (maxGx + maxGy) * halfH
    const yMax = (maxGx + maxGy) * (ISO_TILE_H / 2);
    this.offsetY = (ISO_CANVAS_H - yMax) / 2;

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

  /** Convert grid coords to isometric world pixel coords (center of tile) */
  gridToWorld(gridX: number, gridY: number): Position {
    return {
      x: (gridX - gridY) * (ISO_TILE_W / 2) + this.offsetX,
      y: (gridX + gridY) * (ISO_TILE_H / 2) + this.offsetY,
    };
  }

  /** Convert isometric world pixel coords to grid coords */
  worldToGrid(worldX: number, worldY: number): Position {
    const rx = (worldX - this.offsetX) / ISO_TILE_W;
    const ry = (worldY - this.offsetY) / ISO_TILE_H;
    return {
      x: Math.floor(rx + ry),
      y: Math.floor(ry - rx),
    };
  }

  /** Fill an isometric diamond tile on a Graphics object */
  fillIsoDiamond(
    graphics: Phaser.GameObjects.Graphics,
    gridX: number, gridY: number,
    color: number, alpha: number,
  ): void {
    const center = this.gridToWorld(gridX, gridY);
    const hw = ISO_TILE_W / 2;
    const hh = ISO_TILE_H / 2;
    graphics.fillStyle(color, alpha);
    graphics.fillPoints([
      new Phaser.Geom.Point(center.x, center.y - hh),
      new Phaser.Geom.Point(center.x + hw, center.y),
      new Phaser.Geom.Point(center.x, center.y + hh),
      new Phaser.Geom.Point(center.x - hw, center.y),
    ], true);
  }

  /** Convert world coords to continuous (non-floored) grid coords for distance calculations */
  worldToGridFloat(worldX: number, worldY: number): { x: number; y: number } {
    const rx = (worldX - this.offsetX) / ISO_TILE_W;
    const ry = (worldY - this.offsetY) / ISO_TILE_H;
    return {
      x: rx + ry,
      y: ry - rx,
    };
  }

  /** Get isometric depth for correct draw order */
  getIsoDepth(gridX: number, gridY: number): number {
    return 10 + gridX + gridY;
  }

  /** Get a 2D walkability array for pathfinding */
  getWalkabilityGrid(): number[][] {
    return this.grid.map((row) =>
      row.map((tile) => (tile.walkable && !tile.occupied ? 0 : 1)),
    );
  }
}
