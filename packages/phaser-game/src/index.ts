import Phaser from 'phaser';
import { gameConfig } from './config';

export { gameConfig } from './config';
export type { GameEventMap } from './EventBus';
export { EventBus } from './EventBus';
export { getPlacementGuardFailure } from './placementRules';
// Re-export systems for testing
export { GridManager } from './systems/GridManager';
export { MergeSystem } from './systems/MergeSystem';
export { findPath, PathfindingSystem } from './systems/PathfindingSystem';
export { RandomTowerSystem } from './systems/RandomTowerSystem';
export { WaveSystem } from './systems/WaveSystem';

export function startGame(parentElement?: string | HTMLElement): Phaser.Game {
	const config: Phaser.Types.Core.GameConfig = {
		...gameConfig,
		parent: parentElement ?? gameConfig.parent,
	};
	return new Phaser.Game(config);
}
