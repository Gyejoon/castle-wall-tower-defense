import type { Grid, GridConfig, Position, Tile } from '@gld/shared';
import {
	DEFAULT_GRID_CONFIG,
	ORTHO_TILE,
} from '@gld/shared';
import Phaser from 'phaser';

export interface GridManagerOptions {
	tileSize?: number;
	canvasWidth?: number;
	canvasHeight?: number;
}

export class GridManager {
	readonly width: number;
	readonly height: number;
	readonly tileSize: number;
	readonly orthoTile: number;
	readonly spawnPoint: Position;
	readonly exitPoint: Position;
	private grid: Grid;
	private readonly offsetX: number;
	private readonly offsetY: number;
	private readonly buildablePointKeys: Set<string>;
	private readonly blockedPlacementPointKeys: Set<string>;
	private readonly pathPointKeys: Set<string>;

	constructor(config: GridConfig = DEFAULT_GRID_CONFIG, options?: GridManagerOptions) {
		this.width = config.width;
		this.height = config.height;

		if (options?.canvasWidth && options?.canvasHeight) {
			const tileByW = Math.floor(options.canvasWidth / this.width);
			const tileByH = Math.floor(options.canvasHeight / this.height);
			this.orthoTile = Math.max(1, Math.min(tileByW, tileByH));
		} else {
			this.orthoTile = options?.tileSize ?? ORTHO_TILE;
		}
		this.tileSize = this.orthoTile;

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

		const gridPixelW = this.orthoTile * this.width;
		const gridPixelH = this.orthoTile * this.height;
		const cw = options?.canvasWidth ?? gridPixelW;
		const ch = options?.canvasHeight ?? gridPixelH;
		this.offsetX = Math.floor((cw - gridPixelW) / 2);
		this.offsetY = Math.floor((ch - gridPixelH) / 2);

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
		const t = this.orthoTile;
		return {
			x: gridX * t + t / 2 + this.offsetX,
			y: gridY * t + t / 2 + this.offsetY,
		};
	}

	/** Convert orthogonal world pixel coords to grid coords */
	worldToGrid(worldX: number, worldY: number): Position {
		const t = this.orthoTile;
		return {
			x: Math.floor((worldX - this.offsetX) / t),
			y: Math.floor((worldY - this.offsetY) / t),
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
		const t = this.orthoTile;
		const center = this.gridToWorld(gridX, gridY);
		const half = t / 2;
		graphics.fillStyle(color, alpha);
		graphics.fillRect(center.x - half, center.y - half, t, t);
	}

	/** Convert world coords to continuous (non-floored) grid coords for distance calculations */
	worldToGridFloat(worldX: number, worldY: number): { x: number; y: number } {
		const t = this.orthoTile;
		return {
			x: (worldX - this.offsetX) / t,
			y: (worldY - this.offsetY) / t,
		};
	}

	/** Get depth for correct draw order (top-down: row-based) */
	getDepth(_gridX: number, gridY: number): number {
		return 10 + gridY;
	}

	/** Get a 2D walkability array for pathfinding */
	getWalkabilityGrid(): number[][] {
		return this.grid.map((row) =>
			row.map((tile) => (tile.walkable && !tile.occupied ? 0 : 1)),
		);
	}
}
