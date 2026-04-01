import { DUAL_CANVAS_H, ISO_CANVAS_W } from '@gld/shared';
import Phaser from 'phaser';
import DragPlugin from 'phaser3-rex-plugins/plugins/drag-plugin.js';
import { Boot } from './scenes/Boot';
import { GameScene } from './scenes/Game';
import { Preloader } from './scenes/Preloader';

export const gameConfig: Phaser.Types.Core.GameConfig = {
	type: Phaser.AUTO,
	width: ISO_CANVAS_W,
	height: DUAL_CANVAS_H,
	parent: 'game-container',
	backgroundColor: '#1a1a2e',
	scale: {
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_HORIZONTALLY,
	},
	plugins: {
		global: [
			{
				key: 'rexDrag',
				plugin: DragPlugin,
				start: true,
			},
		],
	},
	scene: [Boot, Preloader, GameScene],
};
