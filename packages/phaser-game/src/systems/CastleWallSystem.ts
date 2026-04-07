import {
	getMapPaths,
	HP_WALL_STAGE_1,
	HP_WALL_STAGE_2,
	type MapLayout,
	TILE_SIZE,
} from '@gld/shared';
import type Phaser from 'phaser';

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

		const paths = getMapPaths(this.map);
		for (const lane of paths) {
			if (lane.length === 0) continue;
			const ep = lane[lane.length - 1];
			const world = this.grid.gridToWorld(ep.x, ep.y);
			const baseDepth = ep.x + ep.y;

			// Wall sprite
			const wall = this.scene.add.sprite(world.x, world.y, 'castle-wall-hp3');
			wall.setDisplaySize(TILE_SIZE, 66);
			wall.setOrigin(0.5, 1.0);
			wall.setDepth(baseDepth + 1);

			// Smoke sprite
			const smoke = this.scene.add.sprite(
				world.x - 16,
				world.y - 24,
				'vfx-wall-smoke',
			);
			smoke.setDepth(baseDepth + 2);
			smoke.setVisible(false);
			smoke.play('wall-smoke');
			smoke.anims.pause();

			// Fire sprites (two per wall)
			const fire1 = this.scene.add.sprite(
				world.x + 10,
				world.y - 8,
				'vfx-wall-fire',
			);
			fire1.setDepth(baseDepth + 2);
			fire1.setVisible(false);
			fire1.play('wall-fire');
			fire1.anims.pause();

			const fire2 = this.scene.add.sprite(
				world.x + 24,
				world.y + 4,
				'vfx-wall-fire',
			);
			fire2.setDepth(baseDepth + 2);
			fire2.setVisible(false);
			fire2.play('wall-fire');
			fire2.anims.pause();

			this.walls.push({ wall, smoke, fires: [fire1, fire2] });
		}
	}

	update(hp: number): void {
		for (const { wall, smoke, fires } of this.walls) {
			if (hp > HP_WALL_STAGE_2) {
				wall.setTexture('castle-wall-hp3');
				smoke.setVisible(false);
				smoke.anims.pause();
				for (const fire of fires) {
					fire.setVisible(false);
					fire.anims.pause();
				}
			} else if (hp > HP_WALL_STAGE_1) {
				wall.setTexture('castle-wall-hp2');
				smoke.setVisible(true);
				if (!smoke.anims.isPlaying) {
					smoke.anims.resume();
				}
				for (const fire of fires) {
					fire.setVisible(false);
					fire.anims.pause();
				}
			} else {
				wall.setTexture('castle-wall-hp1');
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
