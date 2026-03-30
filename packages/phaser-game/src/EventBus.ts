import { Events } from 'phaser';
import type {
  PlacementFailureReason,
  Position,
  UnitType,
  PressureChoice,
  GhostRecord,
} from '@gld/shared';

export interface GameEventMap {
  // Game → React
  'game-ready': undefined;
  'tower-placed': {
    col: number;
    row: number;
    towerId: string;
    success: boolean;
    reason?: PlacementFailureReason;
  };
  'unit-spawned': { unitType: UnitType; count: number };
  'player-damaged': { playerId: string; damage: number; remainingHp: number };
  'path-updated': { path: Position[] };
  'game-over': { winnerId: string };
  'gold-changed': { gold: number };
  'wave-started': { wave: number; totalWaves: number };
  'wave-completed': { wave: number; totalWaves: number };
  'building-phase-started': { nextWave: number; countdown: number };
  'countdown-tick': { secondsLeft: number };
  'game-won': undefined;
  'pressure-choice-made': { choice: PressureChoice };
  'ghost-pressure-applied': { wave: number; pressure: PressureChoice };
  'ghost-battle-result': { playerRecord: GhostRecord };

  // Tower sell
  'tower-sold': { col: number; row: number; refund: number };

  // Wave preview (sent during building phase)
  'wave-preview': { wave: number; groups: Array<{ unitId: string; unitName: string; count: number }> };

  // React → Game
  'request-select-tower': { towerDefId: string };
  'request-clear-tower-selection': undefined;
  'request-place-tower': { col: number; row: number; towerDefId: string };
  'request-sell-tower': { col: number; row: number };
  'request-start-wave': undefined;
  'request-start-game': undefined;
  'request-pause': undefined;
  'request-resume': undefined;
  'request-pressure-choice': { choice: PressureChoice };
  'start-ghost-battle': { ghost: GhostRecord };

  // Internal
  'current-scene-ready': Phaser.Scene;
}

class TypedEventBus {
  private emitter = new Events.EventEmitter();

  emit<K extends keyof GameEventMap>(
    event: K,
    ...args: GameEventMap[K] extends undefined ? [] : [GameEventMap[K]]
  ): void {
    this.emitter.emit(event, ...args);
  }

  on<K extends keyof GameEventMap>(
    event: K,
    fn: GameEventMap[K] extends undefined ? () => void : (data: GameEventMap[K]) => void,
    context?: unknown,
  ): void {
    this.emitter.on(event, fn as (...args: unknown[]) => void, context);
  }

  off<K extends keyof GameEventMap>(
    event: K,
    fn: GameEventMap[K] extends undefined ? () => void : (data: GameEventMap[K]) => void,
    context?: unknown,
  ): void {
    this.emitter.off(event, fn as (...args: unknown[]) => void, context);
  }

  removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }
}

export const EventBus = new TypedEventBus();
