import Phaser from 'phaser';
import { ISO_CANVAS_W, DUAL_CANVAS_H } from '@gld/shared';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { GameScene } from './scenes/Game';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: ISO_CANVAS_W,
  height: DUAL_CANVAS_H,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [Boot, Preloader, GameScene],
};
