import type { Grid, GridConfig, Position, Tile } from '@gld/shared';
import {
	DEFAULT_GRID_CONFIG,
	getAllPathCells,
	type MapLayout,
	ORTHO_TILE,
} from '@gld/shared';
import type Phaser from 'phaser';

export interface GridManagerOptions {
	tileSize?: number;
	canvasWidth?: number;
	canvasHeight?: number;
}

export class GridManager {
	readonly mapId?: string;
	readonly width: number;
	readonly height: number;
	readonly tileSize: number;
	readonly orthoTile: number;
	readonly spawnPoint: Position;
	readonly exitPoint: Position;
	private grid: Grid;
	private readonly offsetX: number;
	private readonly offsetY: number;
	private readonly buildablePoints: Position[];
	private readonly buildablePointKeys: Set<string>;
	private readonly blockedPlacementPointKeys: Set<string>;
	private readonly pathPointKeys: Set<string>;
	private readonly placementAnchors: Array<
		Position & { worldX: number; worldY: number }
	>;
	private readonly placementAnchorByKey: Map<
		string,
		Position & { worldX: number; worldY: number }
	>;

	constructor(
		config: GridConfig = DEFAULT_GRID_CONFIG,
		options?: GridManagerOptions,
	) {
		this.mapId = (config as Partial<MapLayout>).id;
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
		const mapConfig = config as GridConfig & Partial<MapLayout>;
		this.buildablePoints = [...(mapConfig.buildablePoints ?? [])];
		this.buildablePointKeys = new Set(
			this.buildablePoints.map((point) => `${point.x},${point.y}`),
		);
		this.placementAnchors = [...(mapConfig.placementAnchors ?? [])];
		this.placementAnchorByKey = new Map(
			this.placementAnchors.map((anchor) => [
				`${anchor.x},${anchor.y}`,
				anchor,
			]),
		);
		this.blockedPlacementPointKeys = new Set(
			(mapConfig.blockedPlacementPoints ?? []).map(
				(point) => `${point.x},${point.y}`,
			),
		);
		// Include all path cells from all lanes
		const allPathCells = mapConfig.paths
			? getAllPathCells(mapConfig as MapLayout)
			: (mapConfig.path ?? []);
		this.pathPointKeys = new Set(
			allPathCells.map((point) => `${point.x},${point.y}`),
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
		return (
			Number.isInteger(x) &&
			Number.isInteger(y) &&
			x >= 0 &&
			x < this.width &&
			y >= 0 &&
			y < this.height
		);
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
		const anchor = this.placementAnchorByKey.get(`${gridX},${gridY}`);
		if (anchor) {
			return { x: anchor.worldX, y: anchor.worldY };
		}

		const t = this.orthoTile;
		return {
			x: gridX * t + t / 2 + this.offsetX,
			y: gridY * t + t / 2 + this.offsetY,
		};
	}

	/** Snap a world point to the nearest buildable visual anchor. */
	snapWorldToBuildable(
		worldX: number,
		worldY: number,
		maxDistancePx = this.orthoTile * 0.85,
	): Position | null {
		if (this.buildablePoints.length === 0) return null;

		let best: { point: Position; distSq: number } | null = null;
		for (const point of this.buildablePoints) {
			const world = this.gridToWorld(point.x, point.y);
			const dx = world.x - worldX;
			const dy = world.y - worldY;
			const distSq = dx * dx + dy * dy;
			if (!best || distSq < best.distSq) {
				best = { point, distSq };
			}
		}

		if (!best || best.distSq > maxDistancePx * maxDistancePx) return null;
		return { x: best.point.x, y: best.point.y };
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
