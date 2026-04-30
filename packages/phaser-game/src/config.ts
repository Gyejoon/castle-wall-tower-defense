import { GAME_CANVAS_H, ORTHO_CANVAS_W } from '@gld/shared';
import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { GameScene } from './scenes/Game';
import { Preloader } from './scenes/Preloader';

// Phase 6: StageDetailScene was removed along with the scenario-mode
// purge. 정식 모드 routes directly into GameScene from the lobby.
export const gameConfig: Phaser.Types.Core.GameConfig = {
	type: Phaser.AUTO,
	width: ORTHO_CANVAS_W,
	height: GAME_CANVAS_H,
	parent: 'game-container',
	backgroundColor: '#1a1a2e',
	pixelArt: true,
	render: {
		preserveDrawingBuffer: true,
		pixelArt: true,
		antialias: false,
		roundPixels: true,
	},
	scale: {
		// v3.1: Scale.FIT keeps the internal logical resolution fixed at
		// 576×1152 (so tower/monster/tile ratios never drift) while uniformly
		// scaling the canvas CSS size to fit `#game-container`. Letterbox
		// bars appear only when the slot aspect ratio doesn't match the
		// game's 1:2 portrait — we size the shell max-width close to the
		// canvas aspect to keep those bars minimal on typical phones.
		//
		// Earlier we tried Scale.NONE + `width/height: 100% !important` on
		// the canvas, but that produced non-uniform stretching (tiles
		// appeared rectangular on short phone viewports) and the content
		// visually shrank instead of scaling up with wider shells.
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_BOTH,
	},
	scene: [Boot, Preloader, GameScene],
};
