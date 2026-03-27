import { Events } from 'phaser';
import type { Position, TowerType, UnitType } from '@gld/shared';

export interface GameEventMap {
  // Game → React
  'game-ready': undefined;
  'tower-placed': { col: number; row: number; towerId: string; success: boolean };
  'unit-spawned': { unitType: UnitType; count: number };
  'player-damaged': { playerId: string; damage: number; remainingHp: number };
  'path-updated': { path: Position[] };
  'game-over': { winnerId: string };
  'gold-changed': { gold: number };
  'wave-changed': { wave: number };

  // React → Game
  'request-place-tower': { col: number; row: number; towerDefId: string };
  'request-send-unit': { unitDefId: string; count: number };
  'request-start-game': undefined;
  'request-pause': undefined;
  'request-resume': undefined;

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
