import {
	getAllPathCells,
	getMapPaths,
	type MapLayout,
	type Position,
} from '@gld/shared';
import type Phaser from 'phaser';
import {
	DIRT_SEAMLESS_KEY,
	GRASS_PLATFORM_FRAMES,
	PLATFORM_LIFT,
	TINY_SWORDS_DECORATION_BY_KEY,
	TINY_SWORDS_PRIMARY_TILESET,
	type TinySwordsDecorationKind,
} from '../../fieldAssets';
import type { GridManager } from '../../systems/GridManager';

interface MapTheme {
	groundTint: number;
	decorTint: number;
	pathColor: number;
	pathLineColor: number;
}

const MAP_THEMES: Record<string, MapTheme> = {
	main_long: {
		groundTint: 0xc8b89a,
		decorTint: 0xc8b89a,
		pathColor: 0x7a6040,
		pathLineColor: 0xb8956a,
	},
};

function getMapTheme(mapId: string): MapTheme {
	return MAP_THEMES[mapId] ?? MAP_THEMES.main_long;
}

type DecorationTile = {
	x: number;
	y: number;
	assetKey: string;
	kind: TinySwordsDecorationKind;
	variant: string;
};

export class FieldRenderer {
	private pathGraphics?: Phaser.GameObjects.Graphics;
	private decorationTiles: DecorationTile[] | null = null;

	constructor(
		private readonly scene: Phaser.Scene,
		private readonly grid: GridManager,
		private readonly map: MapLayout,
	) {}

	renderAll(options?: { dark?: boolean }): void {
		const dark = options?.dark ?? false;
		if (this.decorationTiles === null) {
			this.cacheDecorationData();
		}
		this.renderField(dark);
		this.renderPath();
		this.renderObstacles();
		this.renderAmbientDecorations();
	}

	refreshPath(_path?: Position[]): void {
		this.renderPath();
	}

	destroy(): void {
		this.pathGraphics?.destroy();
		this.pathGraphics = undefined;
		this.decorationTiles = null;
	}

	private cacheDecorationData(): void {
		const tilemap = this.scene.make.tilemap({ key: this.map.tilemapKey });
		const decorLayer = tilemap.getObjectLayer?.('decorations');
		if (!decorLayer) {
			this.decorationTiles = [];
			return;
		}

		this.decorationTiles = decorLayer.objects
			.map((object) => {
				const properties = new Map(
					(object.properties ?? []).map(
						(property: { name: string; value: unknown }) => [
							property.name,
							property.value,
						],
					),
				);
				const assetKey = properties.get('assetKey');
				const kind = properties.get('kind');
				const variant = properties.get('variant');

				if (
					typeof assetKey !== 'string' ||
					typeof kind !== 'string' ||
					typeof variant !== 'string'
				) {
					return null;
				}

				const objectX = typeof object.x === 'number' ? object.x : 0;
				const objectY = typeof object.y === 'number' ? object.y : 0;

				return {
					x: Math.round(objectX / this.map.tileSize),
					y: Math.round(objectY / this.map.tileSize),
					assetKey,
					kind: kind as TinySwordsDecorationKind,
					variant,
				};
			})
			.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
	}

	private renderField(dark: boolean): void {
		const theme = getMapTheme(this.map.id);
		const tile = this.grid.orthoTile;
		const canvasW = this.scene.scale.width;
		const canvasH = this.scene.scale.height;

		if (typeof this.scene.add.tileSprite === 'function') {
			const dirtBg = this.scene.add.tileSprite(
				canvasW / 2,
				canvasH / 2,
				canvasW,
				canvasH,
				DIRT_SEAMLESS_KEY,
			);
			dirtBg.setDepth(0);
			dirtBg.setScrollFactor(0);
			if (dark) dirtBg.setTint(0x5c6585);
		}

		// 맵 밖과 path 셀은 low ground로 취급.
		const pathCells = getAllPathCells(this.map);
		const pathSet = new Set(pathCells.map((p) => `${p.x},${p.y}`));
		const isLow = (x: number, y: number) =>
			pathSet.has(`${x},${y}`) ||
			x < 0 ||
			x >= this.map.width ||
			y < 0 ||
			y >= this.map.height;

		const lift = tile * PLATFORM_LIFT;
		const extraTiles = 2;
		for (let y = -extraTiles; y < this.map.height + extraTiles; y++) {
			for (let x = -extraTiles; x < this.map.width + extraTiles; x++) {
				if (isLow(x, y)) continue;

				// NSEW 비트마스크: 어느 이웃이 low ground인가.
				let bitmask = 0;
				if (isLow(x, y - 1)) bitmask |= 1;
				if (isLow(x + 1, y)) bitmask |= 2;
				if (isLow(x, y + 1)) bitmask |= 4;
				if (isLow(x - 1, y)) bitmask |= 8;

				const frame = GRASS_PLATFORM_FRAMES[bitmask] ?? 10;
				const world = this.grid.gridToWorld(x, y);

				const spr = this.scene.add.sprite(
					world.x,
					world.y - lift,
					TINY_SWORDS_PRIMARY_TILESET.key,
					frame,
				);
				spr.setDisplaySize(tile, tile);
				spr.setOrigin(0.5, 0.5);
				spr.setDepth(2);
				if (dark) spr.setTint(0x6b7899);
				else if (theme.groundTint !== 0xffffff) spr.setTint(theme.groundTint);

				const hasSouth = !!(bitmask & 4);
				const hasEast = !!(bitmask & 2);
				const hasWest = !!(bitmask & 8);

				if (hasSouth || hasEast || hasWest) {
					const cg = this.scene.add.graphics();
					cg.setDepth(1.5);
					const baseX = world.x - tile / 2;
					const baseY = world.y - lift + tile / 2;

					if (hasSouth) {
						const cliffH = tile * 0.6;
						cg.fillStyle(dark ? 0x3d4558 : 0x6b7b50, 1);
						cg.fillRect(baseX, baseY, tile, cliffH * 0.35);
						cg.fillStyle(dark ? 0x343d4e : 0x5a6843, 1);
						cg.fillRect(baseX, baseY + cliffH * 0.35, tile, cliffH * 0.35);
						cg.fillStyle(dark ? 0x2c3544 : 0x4a5636, 1);
						cg.fillRect(baseX, baseY + cliffH * 0.7, tile, cliffH * 0.3);
						cg.fillStyle(dark ? 0x4a5568 : 0x7d8e5c, 1);
						cg.fillRect(baseX, baseY, tile, 2);
					}

					if (hasEast) {
						cg.fillStyle(dark ? 0x3a4355 : 0x5e6e46, 0.7);
						cg.fillRect(baseX + tile - 3, world.y - lift - tile / 2, 3, tile);
					}

					if (hasWest) {
						cg.fillStyle(dark ? 0x3a4355 : 0x5e6e46, 0.7);
						cg.fillRect(baseX, world.y - lift - tile / 2, 3, tile);
					}
				}
			}
		}

		if (!dark) {
			const shadowGraphics = this.scene.add.graphics();
			shadowGraphics.setDepth(0.5);
			for (const p of pathCells) {
				if (!isLow(p.x, p.y - 1)) {
					const w = this.grid.gridToWorld(p.x, p.y);
					shadowGraphics.fillStyle(0x000000, 0.15);
					shadowGraphics.fillRect(
						w.x - tile / 2,
						w.y - tile / 2,
						tile,
						tile * 0.4,
					);
				}
			}
		}

		this.renderDecorations(dark);
	}

	private renderDecorations(dark: boolean): void {
		if (!this.decorationTiles) return;
		const theme = getMapTheme(this.map.id);

		for (const { x, y, assetKey } of this.decorationTiles) {
			const asset = TINY_SWORDS_DECORATION_BY_KEY[assetKey];
			if (!asset) continue;

			const world = this.grid.gridToWorld(x, y);
			const sprite = this.scene.add.sprite(world.x, world.y, assetKey, 0);
			sprite.setDisplaySize(asset.renderWidth, asset.renderHeight);
			sprite.setOrigin(0.5, asset.originY);
			sprite.setDepth(3 + x + y + asset.depthOffset);
			if (dark) {
				sprite.setTint(0x66758f);
			} else if (theme.decorTint !== 0xffffff) {
				sprite.setTint(theme.decorTint);
			}
		}
	}

	private renderPath(): void {
		if (!this.pathGraphics) this.pathGraphics = this.scene.add.graphics();
		const graphics = this.pathGraphics;
		graphics.clear();

		const theme = getMapTheme(this.map.id);
		const lineColor = theme.pathLineColor;
		const paths = getMapPaths(this.map);

		for (const path of paths) {
			if (path.length < 2) continue;

			graphics.lineStyle(4, lineColor, 0.04);
			graphics.beginPath();
			const first = this.grid.gridToWorld(path[0].x, path[0].y);
			graphics.moveTo(first.x, first.y);
			for (let i = 1; i < path.length; i++) {
				const pt = this.grid.gridToWorld(path[i].x, path[i].y);
				graphics.lineTo(pt.x, pt.y);
			}
			graphics.strokePath();

			graphics.fillStyle(lineColor, 0.25);
			for (let i = 0; i < path.length - 1; i++) {
				const a = this.grid.gridToWorld(path[i].x, path[i].y);
				const b = this.grid.gridToWorld(path[i + 1].x, path[i + 1].y);
				for (let s = 0; s < 4; s += 2) {
					const t = s / 4;
					graphics.fillCircle(
						a.x + (b.x - a.x) * t,
						a.y + (b.y - a.y) * t,
						1.5,
					);
				}
			}
			const last = this.grid.gridToWorld(
				path[path.length - 1].x,
				path[path.length - 1].y,
			);
			graphics.fillCircle(last.x, last.y, 1.5);
		}
	}

	// obstacles는 buildable/pathPoints에서 이미 배제된 시각 전용 요소다.
	private renderObstacles(): void {
		const obstacles = this.map.obstacles;
		if (!obstacles || obstacles.length === 0) return;
		const ASSET_KEYS = [
			'tiny-swords-tree-1',
			'tiny-swords-rock-1',
			'tiny-swords-bush-1',
		] as const;
		const tile = this.grid.orthoTile;
		const lift = tile * PLATFORM_LIFT;
		obstacles.forEach((pos, i) => {
			const key = ASSET_KEYS[i % ASSET_KEYS.length];
			if (!this.scene.textures.exists(key)) return;
			const world = this.grid.gridToWorld(pos.x, pos.y);
			const sprite = this.scene.add.sprite(world.x, world.y - lift, key, 0);
			sprite.setDisplaySize(tile * 0.92, tile * 0.92);
			sprite.setOrigin(0.5, 0.7);
			sprite.setDepth(3 + pos.x + pos.y);
		});
	}

	// 배경 장식: 게임 플레이 좌표와 겹치지 않는 시각 전용 스프라이트.
	private renderAmbientDecorations(): void {
		const decorations = this.map.decorations;
		if (!decorations || decorations.length === 0) return;
		const tile = this.grid.orthoTile;
		decorations.forEach((deco) => {
			const variant = deco.variant ?? 1;
			const key = `tiny-swords-${deco.kind}-${variant}`;
			if (!this.scene.textures.exists(key)) return;
			const world = this.grid.gridToWorld(deco.x, deco.y);
			const sprite = this.scene.add.sprite(world.x, world.y, key, 0);
			const scale = deco.kind === 'tree' ? 1.1 : 0.85;
			sprite.setDisplaySize(tile * scale, tile * scale);
			sprite.setOrigin(0.5, 0.72);
			sprite.setAlpha(0.85);
			sprite.setDepth(2.5);
		});
	}
}
