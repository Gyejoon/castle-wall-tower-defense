import Phaser from 'phaser';
import { ALL_TOWERS } from '@gld/shared';

const UNIT_IDS = [
  'scout_drone',
  'battle_robot',
  'heavy_walker',
  'stealth_drone',
  'titan',
] as const;

const TOWER_IDS = ALL_TOWERS.map((tower) => tower.id);

export class Preloader extends Phaser.Scene {
  constructor() {
    super('Preloader');
  }

  preload() {
    // Tilemap
    this.load.image('tileset-forest', 'assets/tileset.png');
    this.load.tilemapTiledJSON('tilemap-forest-gate', 'assets/maps/forest-gate.json');

    for (const id of TOWER_IDS) {
      this.load.image(`tower-${id}`, `assets/towers/${id}.png`);
    }

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

    // Pressure UI images
    this.load.image('pressure-defend', 'assets/ui/pressure-defend.png');
    this.load.image('pressure-attack', 'assets/ui/pressure-attack.png');
    this.load.image('pressure-invest', 'assets/ui/pressure-invest.png');
    this.load.image('pressure-panel-bg', 'assets/ui/pressure-panel-bg.png');

    // Match UI images
    this.load.image('match-victory', 'assets/ui/match-victory.png');
    this.load.image('match-defeat', 'assets/ui/match-defeat.png');
    this.load.image('match-draw', 'assets/ui/match-draw.png');
    this.load.image('ghost-avatar', 'assets/ui/ghost-avatar.png');

    // Stat icons spritesheet (96x16, 3 icons at 16x16 — but loaded as 32x32 safe fallback)
    this.load.spritesheet('stat-icons', 'assets/ui/stat-icons.png', {
      frameWidth: 16,
      frameHeight: 16,
    });

    // VFX spritesheets (all in ui/ folder)
    this.load.spritesheet('pressure-attack-effect', 'assets/ui/pressure-attack-effect.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('ghost-spawn', 'assets/ui/ghost-spawn.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet('victory-confetti', 'assets/ui/victory-confetti.png', {
      frameWidth: 32,
      frameHeight: 64,
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

    // Pressure attack VFX animation
    this.anims.create({
      key: 'pressure-attack-effect',
      frames: this.anims.generateFrameNumbers('pressure-attack-effect', {
        start: 0,
        end: 3,
      }),
      frameRate: 10,
      repeat: 0,
    });

    // Ghost spawn VFX animation
    this.anims.create({
      key: 'ghost-spawn',
      frames: this.anims.generateFrameNumbers('ghost-spawn', {
        start: 0,
        end: 3,
      }),
      frameRate: 8,
      repeat: 0,
    });

    // Victory confetti VFX animation
    this.anims.create({
      key: 'victory-confetti',
      frames: this.anims.generateFrameNumbers('victory-confetti', {
        start: 0,
        end: 3,
      }),
      frameRate: 6,
      repeat: 2,
    });

    this.scene.start('Game');
  }
}
