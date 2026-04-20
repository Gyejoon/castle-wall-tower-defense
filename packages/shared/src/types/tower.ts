export type ElementType = 'fire' | 'water' | 'lightning' | 'neutral';

/**
 * Tower family — Phase A family/tier model. Replaces the old TowerType /
 * FusionTowerType string union. Each of the four base families (archer /
 * siege / frost / stun) has tiers 1→4; T4s from two different base families
 * merge into T5 hybrids (hybrid_ab, hybrid_cd); the two hybrids merge into
 * the T6 ultimate.
 */
export type TowerFamily =
	| 'archer'
	| 'siege'
	| 'frost'
	| 'stun'
	| 'hybrid'
	| 'ultimate';

export type TowerId =
	// archer family T1-T4
	| 'archer'
	| 'wind_spire'
	| 'flame_tower'
	| 'arcane_spire'
	// siege family T1-T4
	| 'nova_cannon'
	| 'fortress'
	| 'earth_golem'
	| 'celestial'
	// frost family T1-T4
	| 'emp'
	| 'stasis_field'
	| 'disruptor'
	| 'world_tree'
	// stun family T1-T4
	| 'shield'
	| 'twin_archer'
	| 'holy_shrine'
	| 'divine_throne'
	// hybrid T5
	| 'hybrid_ab'
	| 'hybrid_cd'
	// ultimate T6
	| 'ultimate';

export interface TowerStats {
	damage: number;
	range: number;
	attackSpeed: number; // attacks per second
	special?: string;
	/** Projectile speed in grid tiles per second. Omit for instant (beam). */
	projectileSpeed?: number;
}

export interface TowerDef {
	id: string; // Canonical: one of TowerId, but kept as string for ergonomic call sites
	name: string;
	family: TowerFamily;
	tier: number; // 1-6
	stats: TowerStats;
	cost: number;
	element: ElementType;
	isPremium: boolean;
	color: string; // hex color for visual
	shape: 'diamond' | 'circle' | 'hexagon' | 'shield' | 'star';
}

export interface PlacedTower {
	instanceId: string;
	defId: string;
	position: { x: number; y: number };
	level: number;
}
