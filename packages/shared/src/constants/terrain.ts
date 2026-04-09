export type TerrainKind =
	| 'plain'
	| 'road'
	| 'forest'
	| 'bog'
	| 'water'
	| 'lava'
	| 'mountain'
	| 'hill'
	| 'cursed';

export const TERRAIN_KINDS: readonly TerrainKind[] = [
	'plain',
	'road',
	'forest',
	'bog',
	'water',
	'lava',
	'mountain',
	'hill',
	'cursed',
] as const;

/** A* cost per tile. Infinity = walkable=false. */
export const TERRAIN_COST: Record<TerrainKind, number> = {
	plain: 1,
	road: 0.9,
	forest: 1.15,
	bog: 1.4,
	hill: 1,
	cursed: 1,
	water: Number.POSITIVE_INFINITY,
	lava: Number.POSITIVE_INFINITY,
	mountain: Number.POSITIVE_INFINITY,
};

/** Unit movement speed multiplier. */
export const TERRAIN_SPEED: Record<TerrainKind, number> = {
	plain: 1,
	road: 1.1,
	forest: 0.85,
	bog: 0.7,
	hill: 1,
	cursed: 1,
	water: 0,
	lava: 0,
	mountain: 0,
};

/** Whether towers can be placed on this terrain. */
export const TERRAIN_BUILDABLE: Record<TerrainKind, boolean> = {
	plain: true,
	road: false,
	forest: true,
	hill: true,
	cursed: true,
	bog: false,
	water: false,
	lava: false,
	mountain: false,
};

export interface TerrainModifier {
	rangeBonus?: number;
	attackMult?: number;
	ccResistance?: number;
	flyingDotPerSec?: number;
}

export const TERRAIN_MODIFIERS: Record<TerrainKind, TerrainModifier> = {
	plain: {},
	road: {},
	forest: {},
	bog: { ccResistance: 0.5 },
	hill: { rangeBonus: 1 },
	cursed: { attackMult: 0.9 },
	water: {},
	lava: { flyingDotPerSec: 5 },
	mountain: {},
};

/** Tiled GID -> TerrainKind. firstgid=1. */
export const TERRAIN_GID_MAP: Record<number, TerrainKind> = {
	1: 'plain',
	2: 'plain',
	3: 'road',
	4: 'forest',
	5: 'bog',
	6: 'water',
	7: 'mountain',
	8: 'hill',
	9: 'cursed',
	10: 'lava',
};
