import type { ElementType } from './tower';

export type UnitSpecialBehavior = 'ranged_tower_attack' | 'damage_shield';

export type UnitType =
	| 'scout_drone'
	| 'battle_robot'
	| 'heavy_walker'
	| 'stealth_drone'
	| 'titan'
	// W2 enemies
	| 'flame_imp'
	| 'lava_golem'
	// W3 enemies
	| 'arcane_mage'
	| 'mana_shield'
	// Bosses
	| 'orc_warlord'
	| 'forge_master'
	| 'corrupted_archmage';

export interface UnitStats {
	hp: number;
	speed: number; // tiles per second
	armor: number;
	special?: string;
}

export interface UnitDef {
	id: string;
	name: string;
	type: UnitType;
	stats: UnitStats;
	element: ElementType;
	bounty: number; // gold earned for killing
	isPremium: boolean;
	flying?: boolean; // exempt from ground collision
	specialBehavior?: UnitSpecialBehavior;
	specialParams?: Record<string, number>;
}

export interface ActiveUnit {
	instanceId: string;
	defId: string;
	position: { x: number; y: number };
	hp: number;
	pathIndex: number;
	/** Remaining shield HP for damage_shield enemies. Undefined = no shield. */
	shieldHp?: number;
}
