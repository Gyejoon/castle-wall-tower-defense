import { TILE_SIZE } from '@gld/shared';

export interface TinySwordsAssetEntry {
	key: string;
	path: string;
	frameWidth: number;
	frameHeight: number;
	frameCount: number;
	pixelWidth: number;
	pixelHeight: number;
}

export type TinySwordsDecorationKind =
	| 'tree_large'
	| 'bush'
	| 'rock_large'
	| 'rock_small';

export type TinySwordsDecorationSize = 'large' | 'small';

export interface TinySwordsDecorationAssetEntry extends TinySwordsAssetEntry {
	kind: TinySwordsDecorationKind;
	size: TinySwordsDecorationSize;
	variant: string;
	renderWidth: number;
	renderHeight: number;
	originY: number;
	depthOffset: number;
}

export const TINY_SWORDS_TILE_SIZE = 64;

export const TINY_SWORDS_TILESET_ASSETS: TinySwordsAssetEntry[] = [
	{
		key: 'tiny-swords-tileset-color-1',
		path: 'assets/vendor/tiny-swords/terrain/tileset/Tilemap_color1.png',
		frameWidth: 64,
		frameHeight: 64,
		frameCount: 54,
		pixelWidth: 576,
		pixelHeight: 384,
	},
	{
		key: 'tiny-swords-tileset-color-2',
		path: 'assets/vendor/tiny-swords/terrain/tileset/Tilemap_color2.png',
		frameWidth: 64,
		frameHeight: 64,
		frameCount: 54,
		pixelWidth: 576,
		pixelHeight: 384,
	},
	{
		key: 'tiny-swords-tileset-color-3',
		path: 'assets/vendor/tiny-swords/terrain/tileset/Tilemap_color3.png',
		frameWidth: 64,
		frameHeight: 64,
		frameCount: 54,
		pixelWidth: 576,
		pixelHeight: 384,
	},
	{
		key: 'tiny-swords-tileset-color-4',
		path: 'assets/vendor/tiny-swords/terrain/tileset/Tilemap_color4.png',
		frameWidth: 64,
		frameHeight: 64,
		frameCount: 54,
		pixelWidth: 576,
		pixelHeight: 384,
	},
	{
		key: 'tiny-swords-tileset-color-5',
		path: 'assets/vendor/tiny-swords/terrain/tileset/Tilemap_color5.png',
		frameWidth: 64,
		frameHeight: 64,
		frameCount: 54,
		pixelWidth: 576,
		pixelHeight: 384,
	},
];

export const TINY_SWORDS_PRIMARY_TILESET = TINY_SWORDS_TILESET_ASSETS[0];
export const TINY_SWORDS_GROUND_FRAMES = [0, 1] as const;

/** Path tileset: 16-frame auto-tile using NSEW bitmask (N=1, E=2, S=4, W=8) */
export const TINY_SWORDS_PATH_TILESET_KEY = 'tiny-swords-path-tileset';

/** Seamless grass ground texture key (128x128 tileable image) */
export const GRASS_SEAMLESS_KEY = 'grass-seamless';

/** Seamless dirt/sand texture for low ground (monster path level) */
export const DIRT_SEAMLESS_KEY = 'dirt-seamless';

/**
 * Grass platform 9-slice frame mapping.
 * Check NSEW neighbors: if neighbor is path → that edge is "exposed".
 * Bitmask: N=1, E=2, S=4, W=8.
 *
 * Tileset 9-slice layout (round-edge, cols 0-2):
 *   Frame 0=TL  1=T   2=TR
 *   Frame 9=L   10=C  11=R
 *   Frame 18=BL 19=B  20=BR
 *   Frame 27-29: narrow bridge pieces
 */
export const GRASS_PLATFORM_FRAMES: Record<number, number> = {
	0: 10, // no edges exposed → center
	1: 1, // N exposed → top edge
	2: 11, // E exposed → right edge
	3: 2, // N+E → top-right corner
	4: 19, // S exposed → bottom edge
	5: 28, // N+S → narrow horizontal bridge
	6: 20, // S+E → bottom-right corner
	7: 11, // N+S+E → narrow right (fallback right edge)
	8: 9, // W exposed → left edge
	9: 0, // N+W → top-left corner
	10: 10, // E+W → narrow vertical (center fallback)
	11: 1, // N+E+W → narrow top (fallback top edge)
	12: 18, // S+W → bottom-left corner
	13: 9, // N+S+W → narrow left (fallback left edge)
	14: 19, // S+E+W → narrow bottom (fallback bottom edge)
	15: 10, // all sides exposed → isolated (center fallback)
};

/** Cliff wall frames — right section of tileset (cols 5-7, rows 3-5) */
export const CLIFF_WALL_FRAMES = {
	topLeft: 32,
	topCenter: 33,
	topRight: 34,
	midLeft: 41,
	midCenter: 42,
	midRight: 43,
} as const;

/** Vertical offset (ratio of tile) to lift platforms visually */
export const PLATFORM_LIFT = 0.4;

export const TINY_SWORDS_DECORATION_ASSETS: TinySwordsDecorationAssetEntry[] = [
	{
		key: 'tiny-swords-rock-1',
		kind: 'rock_large',
		size: 'large',
		variant: 'Rock1.png',
		path: 'assets/vendor/tiny-swords/terrain/decorations/rocks/Rock1.png',
		frameWidth: 64,
		frameHeight: 64,
		frameCount: 1,
		pixelWidth: 64,
		pixelHeight: 64,
		renderWidth: (TILE_SIZE * 29) / 24,
		renderHeight: (TILE_SIZE * 29) / 24,
		originY: 0.74,
		depthOffset: 18,
	},
	{
		key: 'tiny-swords-rock-2',
		kind: 'rock_large',
		size: 'large',
		variant: 'Rock2.png',
		path: 'assets/vendor/tiny-swords/terrain/decorations/rocks/Rock2.png',
		frameWidth: 64,
		frameHeight: 64,
		frameCount: 1,
		pixelWidth: 64,
		pixelHeight: 64,
		renderWidth: (TILE_SIZE * 7) / 6,
		renderHeight: (TILE_SIZE * 7) / 6,
		originY: 0.74,
		depthOffset: 18,
	},
	{
		key: 'tiny-swords-rock-3',
		kind: 'rock_small',
		size: 'small',
		variant: 'Rock3.png',
		path: 'assets/vendor/tiny-swords/terrain/decorations/rocks/Rock3.png',
		frameWidth: 64,
		frameHeight: 64,
		frameCount: 1,
		pixelWidth: 64,
		pixelHeight: 64,
		renderWidth: TILE_SIZE,
		renderHeight: TILE_SIZE,
		originY: 0.72,
		depthOffset: 14,
	},
	{
		key: 'tiny-swords-rock-4',
		kind: 'rock_small',
		size: 'small',
		variant: 'Rock4.png',
		path: 'assets/vendor/tiny-swords/terrain/decorations/rocks/Rock4.png',
		frameWidth: 64,
		frameHeight: 64,
		frameCount: 1,
		pixelWidth: 64,
		pixelHeight: 64,
		renderWidth: TILE_SIZE,
		renderHeight: TILE_SIZE,
		originY: 0.72,
		depthOffset: 14,
	},
	{
		key: 'tiny-swords-bush-1',
		kind: 'bush',
		size: 'small',
		variant: 'Bushe1.png',
		path: 'assets/vendor/tiny-swords/terrain/decorations/bushes/Bushe1.png',
		frameWidth: 128,
		frameHeight: 128,
		frameCount: 8,
		pixelWidth: 1024,
		pixelHeight: 128,
		renderWidth: (TILE_SIZE * 4) / 3,
		renderHeight: (TILE_SIZE * 4) / 3,
		originY: 0.74,
		depthOffset: 16,
	},
	{
		key: 'tiny-swords-bush-2',
		kind: 'bush',
		size: 'small',
		variant: 'Bushe2.png',
		path: 'assets/vendor/tiny-swords/terrain/decorations/bushes/Bushe2.png',
		frameWidth: 128,
		frameHeight: 128,
		frameCount: 8,
		pixelWidth: 1024,
		pixelHeight: 128,
		renderWidth: (TILE_SIZE * 4) / 3,
		renderHeight: (TILE_SIZE * 4) / 3,
		originY: 0.74,
		depthOffset: 16,
	},
	{
		key: 'tiny-swords-bush-3',
		kind: 'bush',
		size: 'small',
		variant: 'Bushe3.png',
		path: 'assets/vendor/tiny-swords/terrain/decorations/bushes/Bushe3.png',
		frameWidth: 128,
		frameHeight: 128,
		frameCount: 8,
		pixelWidth: 1024,
		pixelHeight: 128,
		renderWidth: (TILE_SIZE * 4) / 3,
		renderHeight: (TILE_SIZE * 4) / 3,
		originY: 0.74,
		depthOffset: 16,
	},
	{
		key: 'tiny-swords-bush-4',
		kind: 'bush',
		size: 'small',
		variant: 'Bushe4.png',
		path: 'assets/vendor/tiny-swords/terrain/decorations/bushes/Bushe4.png',
		frameWidth: 128,
		frameHeight: 128,
		frameCount: 8,
		pixelWidth: 1024,
		pixelHeight: 128,
		renderWidth: (TILE_SIZE * 4) / 3,
		renderHeight: (TILE_SIZE * 4) / 3,
		originY: 0.74,
		depthOffset: 16,
	},
	{
		key: 'tiny-swords-tree-1',
		kind: 'tree_large',
		size: 'large',
		variant: 'Tree1.png',
		path: 'assets/vendor/tiny-swords/terrain/resources/wood/trees/Tree1.png',
		frameWidth: 256,
		frameHeight: 256,
		frameCount: 6,
		pixelWidth: 1536,
		pixelHeight: 256,
		renderWidth: (TILE_SIZE * 7) / 3,
		renderHeight: (TILE_SIZE * 7) / 3,
		originY: 0.78,
		depthOffset: 36,
	},
	{
		key: 'tiny-swords-tree-2',
		kind: 'tree_large',
		size: 'large',
		variant: 'Tree2.png',
		path: 'assets/vendor/tiny-swords/terrain/resources/wood/trees/Tree2.png',
		frameWidth: 256,
		frameHeight: 256,
		frameCount: 6,
		pixelWidth: 1536,
		pixelHeight: 256,
		renderWidth: (TILE_SIZE * 7) / 3,
		renderHeight: (TILE_SIZE * 7) / 3,
		originY: 0.78,
		depthOffset: 36,
	},
	{
		key: 'tiny-swords-tree-3',
		kind: 'tree_large',
		size: 'large',
		variant: 'Tree3.png',
		path: 'assets/vendor/tiny-swords/terrain/resources/wood/trees/Tree3.png',
		frameWidth: 256,
		frameHeight: 192,
		frameCount: 6,
		pixelWidth: 1536,
		pixelHeight: 192,
		renderWidth: (TILE_SIZE * 7) / 3,
		renderHeight: TILE_SIZE * 2,
		originY: 0.78,
		depthOffset: 36,
	},
	{
		key: 'tiny-swords-tree-4',
		kind: 'tree_large',
		size: 'large',
		variant: 'Tree4.png',
		path: 'assets/vendor/tiny-swords/terrain/resources/wood/trees/Tree4.png',
		frameWidth: 256,
		frameHeight: 192,
		frameCount: 6,
		pixelWidth: 1536,
		pixelHeight: 192,
		renderWidth: (TILE_SIZE * 7) / 3,
		renderHeight: TILE_SIZE * 2,
		originY: 0.78,
		depthOffset: 36,
	},
];

export const TINY_SWORDS_DECORATION_BY_KEY = Object.fromEntries(
	TINY_SWORDS_DECORATION_ASSETS.map((asset) => [asset.key, asset]),
) as Record<string, TinySwordsDecorationAssetEntry>;
