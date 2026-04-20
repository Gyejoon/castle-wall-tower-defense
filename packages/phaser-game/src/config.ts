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
		// Phase A [B4]: pin the canvas to the fixed 432×960 logical
		// resolution. React wraps `#game-container` in a CSS-transform scale
		// wrapper (see `useViewportScale`), so Phaser renders once at a
		// device-independent size and the browser scales the whole UI
		// uniformly. Scale.FIT would re-derive internal units from the
		// parent's CSS size, which made tower/monster ratios drift between
		// iPhone SE and Galaxy Fold viewports.
		mode: Phaser.Scale.NONE,
		autoCenter: Phaser.Scale.NO_CENTER,
	},
	scene: [Boot, Preloader, GameScene],
};
