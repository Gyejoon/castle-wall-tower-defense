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
		renderWidth: 58,
		renderHeight: 58,
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
		renderWidth: 56,
		renderHeight: 56,
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
		renderWidth: 48,
		renderHeight: 48,
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
		renderWidth: 48,
		renderHeight: 48,
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
		renderWidth: 64,
		renderHeight: 64,
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
		renderWidth: 64,
		renderHeight: 64,
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
		renderWidth: 64,
		renderHeight: 64,
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
		renderWidth: 64,
		renderHeight: 64,
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
		renderWidth: 112,
		renderHeight: 112,
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
		renderWidth: 112,
		renderHeight: 112,
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
		renderWidth: 112,
		renderHeight: 96,
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
		renderWidth: 112,
		renderHeight: 96,
		originY: 0.78,
		depthOffset: 36,
	},
];

export const TINY_SWORDS_DECORATION_BY_KEY = Object.fromEntries(
	TINY_SWORDS_DECORATION_ASSETS.map((asset) => [asset.key, asset]),
) as Record<string, TinySwordsDecorationAssetEntry>;
