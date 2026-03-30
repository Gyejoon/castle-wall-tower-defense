import Phaser from 'phaser';

const UNIT_IDS = [
  'scout_drone',
  'battle_robot',
  'heavy_walker',
  'stealth_drone',
  'titan',
] as const;

export class Preloader extends Phaser.Scene {
  constructor() {
    super('Preloader');
  }

  preload() {
    // Tileset and tilemap
    this.load.image('tileset-forest', 'assets/tileset.png');
    this.load.tilemapTiledJSON('tilemap-forest-gate', 'assets/maps/forest-gate.json');

    // Unit walk-cycle sprite sheets (128x32, 4 frames at 32x32)
    for (const id of UNIT_IDS) {
      this.load.spritesheet(`unit-${id}`, `assets/units/${id}.png`, {
        frameWidth: 32,
        frameHeight: 32,
      });
    }

    // Shared unit death effect (128x32, 4 frames at 32x32)
    this.load.spritesheet('unit-death', 'assets/units/unit-death.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
  }

  create() {
    // Create walk animations for each unit type
    for (const id of UNIT_IDS) {
      this.anims.create({
        key: `${id}-walk`,
        frames: this.anims.generateFrameNumbers(`unit-${id}`, {
          start: 0,
          end: 3,
        }),
        frameRate: 8,
        repeat: -1,
      });
    }

    // Death animation (shared across all units)
    this.anims.create({
      key: 'unit-death',
      frames: this.anims.generateFrameNumbers('unit-death', {
        start: 0,
        end: 3,
      }),
      frameRate: 10,
      repeat: 0,
    });

    this.scene.start('Game');
  }
}
