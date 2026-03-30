import type { Position } from './grid';

// React → Game Engine
export type ReactToGameEvent =
  | { type: 'START_GAME'; config: { gridWidth: number; gridHeight: number } }
  | { type: 'PLACE_TOWER'; towerId: string; position: Position }
  | { type: 'SEND_UNIT'; unitId: string; count: number }
  | { type: 'PAUSE_GAME' }
  | { type: 'RESUME_GAME' };

// Game Engine → React
export type GameToReactEvent =
  | { type: 'GAME_READY' }
  | { type: 'TOWER_PLACED'; towerId: string; position: Position; success: boolean }
  | { type: 'UNIT_SPAWNED'; unitId: string; count: number }
  | { type: 'PLAYER_DAMAGED'; playerId: string; damage: number; remainingHp: number }
  | { type: 'GAME_OVER'; winnerId: string };
