import type { Position, Tile, Grid, GridConfig } from '@gld/shared';
import { GRID_WIDTH, GRID_HEIGHT, TILE_SIZE, DEFAULT_GRID_CONFIG } from '@gld/shared';

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

  /** Draw the grid using Phaser Graphics */
  render(graphics: Phaser.GameObjects.Graphics): void {
    const ts = this.tileSize;

    // Background fill
    graphics.fillStyle(0x0e0e18, 1);
    graphics.fillRect(0, 0, this.width * ts, this.height * ts);

    // Draw tiles with subtle checkerboard depth
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const px = x * ts;
        const py = y * ts;
        const isDark = (x + y) % 2 === 0;

        // Checkerboard tile
        graphics.fillStyle(isDark ? 0x12121e : 0x161625, 1);
        graphics.fillRect(px + 1, py + 1, ts - 2, ts - 2);

        // Inner edge highlight (top-left)
        graphics.lineStyle(1, 0x252538, 0.3);
        graphics.beginPath();
        graphics.moveTo(px + 1, py + ts - 1);
        graphics.lineTo(px + 1, py + 1);
        graphics.lineTo(px + ts - 1, py + 1);
        graphics.strokePath();
      }
    }

    // Grid lines (subtle)
    graphics.lineStyle(1, 0x1e1e30, 0.6);
    for (let x = 0; x <= this.width; x++) {
      graphics.beginPath();
      graphics.moveTo(x * ts, 0);
      graphics.lineTo(x * ts, this.height * ts);
      graphics.strokePath();
    }
    for (let y = 0; y <= this.height; y++) {
      graphics.beginPath();
      graphics.moveTo(0, y * ts);
      graphics.lineTo(this.width * ts, y * ts);
      graphics.strokePath();
    }

    // Spawn point — glowing green
    const sp = this.spawnPoint;
    graphics.fillStyle(0x2cb67d, 0.15);
    // Glow spread (3x3 around spawn)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const sx = sp.x + dx, sy = sp.y + dy;
        if (this.isInBounds(sx, sy) && (dx !== 0 || dy !== 0)) {
          graphics.fillRect(sx * ts, sy * ts, ts, ts);
        }
      }
    }
    graphics.fillStyle(0x2cb67d, 0.35);
    graphics.fillRect(sp.x * ts, sp.y * ts, ts, ts);
    // Spawn icon (arrow →)
    graphics.fillStyle(0x2cb67d, 0.8);
    const scx = sp.x * ts + ts / 2, scy = sp.y * ts + ts / 2;
    graphics.fillTriangle(scx - 4, scy - 6, scx + 6, scy, scx - 4, scy + 6);

    // Exit point — glowing pink
    const ep = this.exitPoint;
    graphics.fillStyle(0xe53170, 0.15);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ex = ep.x + dx, ey = ep.y + dy;
        if (this.isInBounds(ex, ey) && (dx !== 0 || dy !== 0)) {
          graphics.fillRect(ex * ts, ey * ts, ts, ts);
        }
      }
    }
    graphics.fillStyle(0xe53170, 0.35);
    graphics.fillRect(ep.x * ts, ep.y * ts, ts, ts);
    // Exit icon (X)
    graphics.lineStyle(2, 0xe53170, 0.8);
    const ecx = ep.x * ts + ts / 2, ecy = ep.y * ts + ts / 2;
    graphics.beginPath();
    graphics.moveTo(ecx - 5, ecy - 5);
    graphics.lineTo(ecx + 5, ecy + 5);
    graphics.moveTo(ecx + 5, ecy - 5);
    graphics.lineTo(ecx - 5, ecy + 5);
    graphics.strokePath();
  }
}
