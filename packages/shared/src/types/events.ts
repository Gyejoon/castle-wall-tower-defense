import type { Position } from './grid';
import type { PlacementFailureReason } from './placement';

// React → Game Engine
export type ReactToGameEvent =
  | { type: 'REQUEST_START_GAME' }
  | { type: 'REQUEST_SELECT_TOWER'; towerDefId: string }
  | { type: 'REQUEST_CLEAR_TOWER_SELECTION' }
  | { type: 'REQUEST_PLACE_TOWER'; towerId: string; position: Position }
  | { type: 'REQUEST_START_WAVE' }
  | { type: 'REQUEST_PAUSE' }
  | { type: 'REQUEST_RESUME' };

// Game Engine → React
export type GameToReactEvent =
  | { type: 'GAME_READY' }
  | {
      type: 'TOWER_PLACED';
      towerId: string;
      position: Position;
      success: boolean;
      reason?: PlacementFailureReason;
    }
  | { type: 'UNIT_SPAWNED'; unitId: string; count: number }
  | { type: 'PLAYER_DAMAGED'; playerId: string; damage: number; remainingHp: number }
  | { type: 'PATH_UPDATED'; path: Position[] }
  | { type: 'GOLD_CHANGED'; gold: number }
  | { type: 'WAVE_STARTED'; wave: number; totalWaves: number }
  | { type: 'WAVE_COMPLETED'; wave: number; totalWaves: number }
  | { type: 'BUILDING_PHASE_STARTED'; nextWave: number; countdown: number }
  | { type: 'COUNTDOWN_TICK'; secondsLeft: number }
  | { type: 'GAME_OVER'; winnerId: string };
