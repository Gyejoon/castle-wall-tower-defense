import type { Position } from './grid';
import type { PlacedTower } from './tower';
import type { ActiveUnit } from './unit';

export interface PlayerState {
	id: string;
	hp: number;
	gold: number;
	towers: PlacedTower[];
	units: ActiveUnit[]; // units currently on THIS player's field (enemies)
	path: Position[]; // current computed path
}

export type WavePhase = 'running' | 'boss' | 'sudden_death' | 'ended';

export interface CombatHudState {
	currentSlot: number;
	phase: WavePhase;
	buyCooldownMs: number;
	bossWarning: boolean;
	suddenDeath: boolean;
	timerLabel: string;
}

export interface GameState {
	tick: number;
	phase: 'waiting' | WavePhase;
	hud: CombatHudState;
	players: [PlayerState, PlayerState];
	winnerId: string | null;
	timeRemaining: number; // seconds
}
