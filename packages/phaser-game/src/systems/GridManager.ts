import type { Grid, GridConfig, Position, Tile } from '@gld/shared';
import {
	BOARD_TOP_PADDING,
	DEFAULT_GRID_CONFIG,
	ORTHO_TILE,
	TILE_SIZE,
} from '@gld/shared';
import Phaser from 'phaser';

export class GridManager {
	readonly width: number;
	readonly height: number;
	readonly tileSize: number;
	readonly spawnPoint: Position;
	readonly exitPoint: Position;
	private grid: Grid;
	private readonly offsetX: number;
	private readonly offsetY: number;
	private readonly buildablePointKeys: Set<string>;
	private readonly blockedPlacementPointKeys: Set<string>;
	private readonly pathPointKeys: Set<string>;

	constructor(config: GridConfig = DEFAULT_GRID_CONFIG) {
		this.width = config.width;
		this.height = config.height;
		this.tileSize = TILE_SIZE;
		this.spawnPoint = config.spawnPoint;
		this.exitPoint = config.exitPoint;
		const mapConfig = config as GridConfig & {
			buildablePoints?: Position[];
			blockedPlacementPoints?: Position[];
			path?: Position[];
		};
		this.buildablePointKeys = new Set(
			(mapConfig.buildablePoints ?? []).map((point) => `${point.x},${point.y}`),
		);
		this.blockedPlacementPointKeys = new Set(
			(mapConfig.blockedPlacementPoints ?? []).map(
				(point) => `${point.x},${point.y}`,
			),
		);
		this.pathPointKeys = new Set(
			(mapConfig.path ?? []).map((point) => `${point.x},${point.y}`),
		);

		this.offsetX = 0;
		this.offsetY = BOARD_TOP_PADDING;

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
		return tile?.walkable === true && tile.occupied === false;
	}

	canPlaceTower(x: number, y: number): boolean {
		const tile = this.getTile(x, y);
		if (!tile?.walkable || tile.occupied) return false;
		if (x === this.spawnPoint.x && y === this.spawnPoint.y) return false;
		if (x === this.exitPoint.x && y === this.exitPoint.y) return false;

		const key = `${x},${y}`;
		if (this.blockedPlacementPointKeys.has(key)) return false;
		if (this.pathPointKeys.has(key)) return false;
		if (this.buildablePointKeys.size > 0) {
			return this.buildablePointKeys.has(key);
		}
		return true;
	}

	placeTower(x: number, y: number, towerId: string): boolean {
		if (!this.canPlaceTower(x, y)) return false;
		const tile = this.getTile(x, y);
		if (!tile) return false;

		tile.occupied = true;
		tile.towerId = towerId;
		return true;
	}

	removeTower(x: number, y: number): boolean {
		const tile = this.getTile(x, y);
		if (!tile?.occupied) return false;

		tile.occupied = false;
		tile.towerId = null;
		return true;
	}

	/** Convert grid coords to orthogonal world pixel coords (center of tile) */
	gridToWorld(gridX: number, gridY: number): Position {
		return {
			x: gridX * ORTHO_TILE + ORTHO_TILE / 2 + this.offsetX,
			y: gridY * ORTHO_TILE + ORTHO_TILE / 2 + this.offsetY,
		};
	}

	/** Convert orthogonal world pixel coords to grid coords */
	worldToGrid(worldX: number, worldY: number): Position {
		return {
			x: Math.floor((worldX - this.offsetX) / ORTHO_TILE),
			y: Math.floor((worldY - this.offsetY) / ORTHO_TILE),
		};
	}

	/** Fill an orthogonal tile rectangle on a Graphics object */
	fillTileRect(
		graphics: Phaser.GameObjects.Graphics,
		gridX: number,
		gridY: number,
		color: number,
		alpha: number,
	): void {
		const center = this.gridToWorld(gridX, gridY);
		const half = ORTHO_TILE / 2;
		graphics.fillStyle(color, alpha);
		graphics.fillRect(center.x - half, center.y - half, ORTHO_TILE, ORTHO_TILE);
	}

	/** Convert world coords to continuous (non-floored) grid coords for distance calculations */
	worldToGridFloat(worldX: number, worldY: number): { x: number; y: number } {
		return {
			x: (worldX - this.offsetX) / ORTHO_TILE,
			y: (worldY - this.offsetY) / ORTHO_TILE,
		};
	}

	/** Get depth for correct draw order (top-down: row-based) */
	getDepth(gridX: number, gridY: number): number {
		return 10 + gridY;
	}

	/** Get a 2D walkability array for pathfinding */
	getWalkabilityGrid(): number[][] {
		return this.grid.map((row) =>
			row.map((tile) => (tile.walkable && !tile.occupied ? 0 : 1)),
		);
	}
}
