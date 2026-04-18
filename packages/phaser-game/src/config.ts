import { GAME_CANVAS_H, ORTHO_CANVAS_W } from '@gld/shared';
import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { GameScene } from './scenes/Game';
import { Preloader } from './scenes/Preloader';

// Phase 6: StageDetailScene was removed along with the scenario-mode
// purge. Phase A routes directly into GameScene from the lobby.
export const gameConfig: Phaser.Types.Core.GameConfig = {
	type: Phaser.AUTO,
	width: ORTHO_CANVAS_W,
	height: GAME_CANVAS_H,
	parent: 'game-container',
	backgroundColor: '#1a1a2e',
	render: {
		preserveDrawingBuffer: true,
	},
	scale: {
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
	},
	scene: [Boot, Preloader, GameScene],
};
