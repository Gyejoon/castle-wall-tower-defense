import Phaser from 'phaser';
import { GRID_WIDTH, GRID_HEIGHT, TILE_SIZE } from '@gld/shared';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { GameScene } from './scenes/Game';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GRID_WIDTH * TILE_SIZE,
  height: GRID_HEIGHT * TILE_SIZE,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [Boot, Preloader, GameScene],
};
