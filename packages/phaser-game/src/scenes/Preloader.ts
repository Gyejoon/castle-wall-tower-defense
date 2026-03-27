import Phaser from 'phaser';

export class Preloader extends Phaser.Scene {
  constructor() {
    super('Preloader');
  }

  create() {
    // No assets to preload yet (using Graphics-based rendering)
    this.scene.start('Game');
  }
}
