import {
	getMapPaths,
	HP_WALL_STAGE_1,
	HP_WALL_STAGE_2,
	type MapLayout,
	TILE_SIZE,
} from '@gld/shared';
import type Phaser from 'phaser';

import { MAIN_LONG_CENTRAL_CASTLE_KEY } from '../scenes/render/FieldRenderer';
import type { GridManager } from './GridManager';

interface WallSet {
	wall: Phaser.GameObjects.Sprite;
	smoke: Phaser.GameObjects.Sprite;
	fires: Phaser.GameObjects.Sprite[];
}

export class CastleWallSystem {
	private scene: Phaser.Scene;
	private grid: GridManager;
	private map: MapLayout;
	private walls: WallSet[] = [];
	private flashTweens: Map<Phaser.GameObjects.Sprite, Phaser.Tweens.Tween> =
		new Map();

	constructor(scene: Phaser.Scene, grid: GridManager, map: MapLayout) {
		this.scene = scene;
		this.grid = grid;
		this.map = map;
	}

	create(): void {
		// Register animations if not already registered
		if (!this.scene.anims.exists('wall-smoke')) {
			this.scene.anims.create({
				key: 'wall-smoke',
				frames: this.scene.anims.generateFrameNumbers('vfx-wall-smoke', {
					start: 0,
					end: 7,
				}),
				frameRate: 8,
				repeat: -1,
			});
		}
		if (!this.scene.anims.exists('wall-fire')) {
			this.scene.anims.create({
				key: 'wall-fire',
				frames: this.scene.anims.generateFrameNumbers('vfx-wall-fire', {
					start: 0,
					end: 7,
				}),
				frameRate: 10,
				repeat: -1,
			});
		}

		// Prefer explicit castleWallTiles (Phase 7+); fall back to lane
		// endpoints for legacy maps without the field.
		const wallTiles =
			this.map.castleWallTiles && this.map.castleWallTiles.length > 0
				? this.map.castleWallTiles
				: getMapPaths(this.map)
						.filter((lane) => lane.length > 0)
						.map((lane) => lane[lane.length - 1]);
		for (const ep of wallTiles) {
			const world = this.grid.gridToWorld(ep.x, ep.y);
			const usesIllustratedCastle =
				this.map.id === 'main_long' &&
				this.scene.textures.exists(MAIN_LONG_CENTRAL_CASTLE_KEY);
			const wallY = world.y + TILE_SIZE / 2; // align wall bottom to tile bottom edge
			const baseDepth = ep.x + ep.y;

			// Wall sprite sized to TILE_SIZE × TILE_SIZE*5/4 so the wall fits
			// its row without overflowing into neighbouring rows. Depth sits
			// above the flat depth=2 grass platform layer (see Game.ts
			// Layer 2 loop); 100+ stays clear of every grid-relative depth
			// layer below.
			const wall = this.scene.add.sprite(
				world.x,
				wallY,
				usesIllustratedCastle
					? MAIN_LONG_CENTRAL_CASTLE_KEY
					: 'castle-wall-hp3',
			);
			if (usesIllustratedCastle) {
				// The illustrated map background already contains the central
				// castle. Keep this sprite as an invisible HP/VFX anchor so we do
				// not double-render a blurry oversized castle on top of the art.
				wall.setDisplaySize(1, 1);
				wall.setVisible(false);
			} else {
				wall.setDisplaySize(TILE_SIZE, (TILE_SIZE * 5) / 4);
			}
			wall.setOrigin(0.5, 1.0);
			wall.setDepth(100 + baseDepth);

			// VFX offsets scaled proportionally to the wall size so smoke/fire
			// still sit on the wall visually. Ratios preserved from the
			// original 48-based hand-tuned values.
			const smoke = this.scene.add.sprite(
				world.x - TILE_SIZE / 4,
				wallY - (TILE_SIZE * 3) / 8,
				'vfx-wall-smoke',
			);
			smoke.setDepth(101 + baseDepth);
			smoke.setVisible(false);
			smoke.play('wall-smoke');
			smoke.anims.pause();

			const fire1 = this.scene.add.sprite(
				world.x + TILE_SIZE / 6,
				wallY - TILE_SIZE / 8,
				'vfx-wall-fire',
			);
			fire1.setDepth(101 + baseDepth);
			fire1.setVisible(false);
			fire1.play('wall-fire');
			fire1.anims.pause();

			const fire2 = this.scene.add.sprite(
				world.x + (TILE_SIZE * 3) / 8,
				wallY + TILE_SIZE / 16,
				'vfx-wall-fire',
			);
			fire2.setDepth(101 + baseDepth);
			fire2.setVisible(false);
			fire2.play('wall-fire');
			fire2.anims.pause();

			this.walls.push({ wall, smoke, fires: [fire1, fire2] });
		}
	}

	update(hp: number): void {
		for (const { wall, smoke, fires } of this.walls) {
			if (hp > HP_WALL_STAGE_2) {
				if (wall.texture.key !== MAIN_LONG_CENTRAL_CASTLE_KEY) {
					wall.setTexture('castle-wall-hp3');
				}
				wall.clearTint();
				smoke.setVisible(false);
				smoke.anims.pause();
				for (const fire of fires) {
					fire.setVisible(false);
					fire.anims.pause();
				}
			} else if (hp > HP_WALL_STAGE_1) {
				if (wall.texture.key === MAIN_LONG_CENTRAL_CASTLE_KEY) {
					wall.setTint(0xd8c8a8);
				} else {
					wall.setTexture('castle-wall-hp2');
				}
				smoke.setVisible(true);
				if (!smoke.anims.isPlaying) {
					smoke.anims.resume();
				}
				for (const fire of fires) {
					fire.setVisible(false);
					fire.anims.pause();
				}
			} else {
				if (wall.texture.key === MAIN_LONG_CENTRAL_CASTLE_KEY) {
					wall.setTint(0xb88a80);
				} else {
					wall.setTexture('castle-wall-hp1');
				}
				smoke.setVisible(true);
				if (!smoke.anims.isPlaying) {
					smoke.anims.resume();
				}
				for (const fire of fires) {
					fire.setVisible(true);
					if (!fire.anims.isPlaying) {
						fire.anims.resume();
					}
				}
			}
		}
	}

	onHit(): void {
		for (const { wall } of this.walls) {
			// Kill existing flash tween
			const existing = this.flashTweens.get(wall);
			if (existing) {
				existing.stop();
				this.flashTweens.delete(wall);
			}

			wall.setTintFill(0xffffff);
			const tween = this.scene.tweens.addCounter({
				duration: 100,
				onComplete: () => {
					wall.clearTint();
					this.flashTweens.delete(wall);
				},
			});
			this.flashTweens.set(wall, tween);
		}
	}

	destroy(): void {
		for (const tween of this.flashTweens.values()) {
			tween.stop();
		}
		this.flashTweens.clear();
		for (const { wall, smoke, fires } of this.walls) {
			wall.destroy();
			smoke.destroy();
			for (const fire of fires) {
				fire.destroy();
			}
		}
		this.walls.length = 0;
	}
}
