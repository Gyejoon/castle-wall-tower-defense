import type { ElementType } from './tower';

export type UnitType =
	| 'scout_drone'
	| 'battle_robot'
	| 'heavy_walker'
	| 'stealth_drone'
	| 'titan';

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
}

export interface ActiveUnit {
	instanceId: string;
	defId: string;
	position: { x: number; y: number };
	hp: number;
	pathIndex: number;
}
