import { getMapPaths, type MapLayout, TILE_SIZE } from '@gld/shared';
import type Phaser from 'phaser';

import type { GridManager } from './GridManager';

interface HutSet {
	hut: Phaser.GameObjects.Sprite;
	smoke: Phaser.GameObjects.Sprite;
}

export class SpawnHutSystem {
	private scene: Phaser.Scene;
	private grid: GridManager;
	private map: MapLayout;
	private huts: HutSet[] = [];

	constructor(scene: Phaser.Scene, grid: GridManager, map: MapLayout) {
		this.scene = scene;
		this.grid = grid;
		this.map = map;
	}

	create(): void {
		// Register animation if not already registered
		if (!this.scene.anims.exists('spawn-smoke')) {
			this.scene.anims.create({
				key: 'spawn-smoke',
				frames: this.scene.anims.generateFrameNumbers('vfx-spawn-smoke', {
					start: 0,
					end: 7,
				}),
				frameRate: 8,
				repeat: -1,
			});
		}

		const paths = getMapPaths(this.map);
		for (const lane of paths) {
			if (lane.length === 0) continue;
			const sp = lane[0];
			const world = this.grid.gridToWorld(sp.x, sp.y);
			const hutY = world.y - TILE_SIZE / 2; // align hut top to tile top edge
			const baseDepth = sp.x + sp.y;

			// Hut sprite — 48×60 matches new tower/tile scale so it fits row 0
			// without overflowing into row 1 where grass platforms live.
			// Depth must sit above the flat depth=2 grass platform layer (see
			// Game.ts Layer 2 loop); we use 100+ to stay well clear of every
			// grid-relative depth layer.
			const hut = this.scene.add.sprite(world.x, hutY, 'spawn-hut-idle');
			hut.setDisplaySize(48, 60);
			hut.setOrigin(0.5, 0.0);
			hut.setDepth(100 + baseDepth);

			// Smoke sprite (below door area) — 60-tall hut => smoke at y+45
			const smoke = this.scene.add.sprite(
				world.x,
				hutY + 45,
				'vfx-spawn-smoke',
			);
			smoke.setDepth(101 + baseDepth);
			smoke.setVisible(false);
			smoke.play('spawn-smoke');
			smoke.anims.pause();

			this.huts.push({ hut, smoke });
		}
	}

	setActive(active: boolean): void {
		for (const { hut, smoke } of this.huts) {
			if (active) {
				hut.setTexture('spawn-hut-active');
				smoke.setVisible(true);
				if (!smoke.anims.isPlaying) {
					smoke.anims.resume();
				}
			} else {
				hut.setTexture('spawn-hut-idle');
				smoke.setVisible(false);
				smoke.anims.pause();
			}
		}
	}

	destroy(): void {
		for (const { hut, smoke } of this.huts) {
			hut.destroy();
			smoke.destroy();
		}
		this.huts.length = 0;
	}
}
