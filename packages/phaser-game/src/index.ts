import Phaser from 'phaser';
import { gameConfig } from './config';

export { EventBus } from './EventBus';
export type { GameEventMap } from './EventBus';
export { gameConfig } from './config';

// Re-export systems for testing
export { GridManager } from './systems/GridManager';
export { PathfindingSystem, findPath } from './systems/PathfindingSystem';
export { WaveSystem } from './systems/WaveSystem';
export { PressureSystem } from './systems/PressureSystem';
export { GhostRecorder } from './systems/GhostRecorder';
export { GhostPlayer } from './systems/GhostPlayer';
export { getPlacementGuardFailure } from './placementRules';

export function startGame(parentElement?: string | HTMLElement): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    ...gameConfig,
    parent: parentElement ?? gameConfig.parent,
  };
  return new Phaser.Game(config);
}
