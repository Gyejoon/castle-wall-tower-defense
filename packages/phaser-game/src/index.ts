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
	let width = gameConfig.width as number;
	let height = gameConfig.height as number;

	const el =
		typeof parentElement === 'string'
			? document.getElementById(parentElement)
			: parentElement;
	if (el) {
		const rect = el.getBoundingClientRect();
		if (rect.width > 0 && rect.height > 0) {
			width = Math.floor(rect.width);
			height = Math.floor(rect.height);
		}
	}

	const config: Phaser.Types.Core.GameConfig = {
		...gameConfig,
		width,
		height,
		parent: parentElement ?? gameConfig.parent,
		scale: {
			mode: Phaser.Scale.FIT,
			autoCenter: Phaser.Scale.CENTER_BOTH,
			width,
			height,
		},
	};
	return new Phaser.Game(config);
}
