import type { PlacedTower } from './tower';
import type { ActiveUnit } from './unit';
import type { Position } from './grid';

export interface PlayerState {
  id: string;
  hp: number;
  gold: number;
  towers: PlacedTower[];
  units: ActiveUnit[]; // units currently on THIS player's field (enemies)
  path: Position[];    // current computed path
}

export type WavePhase = 'building' | 'combat' | 'ended';

export interface GameState {
  tick: number;
  phase: 'waiting' | WavePhase;
  players: [PlayerState, PlayerState];
  winnerId: string | null;
  timeRemaining: number; // seconds
}
