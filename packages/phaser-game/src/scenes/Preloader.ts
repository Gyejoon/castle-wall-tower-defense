import Phaser from 'phaser';
import { PRELOAD_TOWER_IDS } from '../constants/preloadAssets';

/** Use WebP if browser supports it, fallback to PNG */
function assetPath(path: string): string {
	return supportsWebP ? path.replace(/\.png$/, '.webp') : path;
}

const supportsWebP = (() => {
	try {
		const c = document.createElement('canvas');
		return c.toDataURL('image/webp').startsWith('data:image/webp');
	} catch {
		return false;
	}
})();

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
		// Field tiles
		this.load.image('grid-floor', assetPath('assets/tiles/grid-floor.png'));
		this.load.image('path-tile', assetPath('assets/tiles/path-tile.png'));
		this.load.image('spawn-tile', assetPath('assets/tiles/spawn-tile.png'));
		this.load.image('exit-tile', assetPath('assets/tiles/exit-tile.png'));

		// Dark variants for AI field
		this.load.image(
			'grid-floor-dark',
			assetPath('assets/tiles/grid-floor-dark.png'),
		);
		this.load.image(
			'path-tile-dark',
			assetPath('assets/tiles/path-tile-dark.png'),
		);
		this.load.image(
			'spawn-tile-dark',
			assetPath('assets/tiles/spawn-tile-dark.png'),
		);
		this.load.image(
			'exit-tile-dark',
			assetPath('assets/tiles/exit-tile-dark.png'),
		);

		// Tileset spritesheet for decoration rendering (32x32 per frame)
		this.load.spritesheet('tileset', assetPath('assets/tiles/tileset.png'), {
			frameWidth: 32,
			frameHeight: 32,
		});

		// Tilemap JSON (Tiled format) for map layers
		this.load.tilemapTiledJSON(
			'tilemap-forest-gate',
			'assets/maps/forest-gate.json',
		);

		for (const id of PRELOAD_TOWER_IDS) {
			this.load.image(`tower-${id}`, assetPath(`assets/towers/${id}.png`));
		}

		// Unit walk-cycle sprite sheets (160x48, 4 frames at 40x48)
		for (const id of UNIT_IDS) {
			this.load.spritesheet(`unit-${id}`, assetPath(`assets/units/${id}.png`), {
				frameWidth: 40,
				frameHeight: 48,
			});
		}

		// Shared unit death effect (160x48, 4 frames at 40x48)
		this.load.spritesheet(
			'unit-death',
			assetPath('assets/units/unit-death.png'),
			{
				frameWidth: 40,
				frameHeight: 48,
			},
		);

		// Pressure UI images
		this.load.image(
			'pressure-defend',
			assetPath('assets/ui/pressure-defend.png'),
		);
		this.load.image(
			'pressure-attack',
			assetPath('assets/ui/pressure-attack.png'),
		);
		this.load.image(
			'pressure-invest',
			assetPath('assets/ui/pressure-invest.png'),
		);
		this.load.image(
			'pressure-panel-bg',
			assetPath('assets/ui/pressure-panel-bg.png'),
		);

		// Match UI images
		this.load.image('match-victory', assetPath('assets/ui/match-victory.png'));
		this.load.image('match-defeat', assetPath('assets/ui/match-defeat.png'));
		this.load.image('match-draw', assetPath('assets/ui/match-draw.png'));
		this.load.image('ghost-avatar', assetPath('assets/ui/ghost-avatar.png'));

		// Stat icons spritesheet (96x16, 3 icons at 16x16 — but loaded as 32x32 safe fallback)
		this.load.spritesheet('stat-icons', assetPath('assets/ui/stat-icons.png'), {
			frameWidth: 16,
			frameHeight: 16,
		});

		// VFX spritesheets (all in ui/ folder)
		this.load.spritesheet(
			'pressure-attack-effect',
			assetPath('assets/ui/pressure-attack-effect.png'),
			{
				frameWidth: 32,
				frameHeight: 32,
			},
		);
		this.load.spritesheet(
			'ghost-spawn',
			assetPath('assets/ui/ghost-spawn.png'),
			{
				frameWidth: 32,
				frameHeight: 32,
			},
		);
		this.load.spritesheet(
			'victory-confetti',
			assetPath('assets/ui/victory-confetti.png'),
			{
				frameWidth: 32,
				frameHeight: 64,
			},
		);
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
