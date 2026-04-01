import Phaser from 'phaser';
import { PRELOAD_TOWER_IDS } from '../constants/preloadAssets';
import {
	TINY_SWORDS_DECORATION_ASSETS,
	TINY_SWORDS_TILESET_ASSETS,
} from '../fieldAssets';

/** Use WebP if browser supports it, fallback to PNG */
function assetPath(path: string): string {
	return supportsWebP ? path.replace(/\.png$/, '.webp') : path;
}

const supportsWebP = (() => {
	try {
		// Skip runtime feature detection under Node/Bun-based tests to avoid jsdom canvas noise.
		if (
			typeof window === 'undefined' ||
			typeof document === 'undefined' ||
			typeof (globalThis as Record<string, unknown>).process !== 'undefined'
		) {
			return false;
		}
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
		for (const asset of TINY_SWORDS_TILESET_ASSETS) {
			this.load.spritesheet(asset.key, asset.path, {
				frameWidth: asset.frameWidth,
				frameHeight: asset.frameHeight,
			});
		}

		for (const asset of TINY_SWORDS_DECORATION_ASSETS) {
			this.load.spritesheet(asset.key, asset.path, {
				frameWidth: asset.frameWidth,
				frameHeight: asset.frameHeight,
			});
		}

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
