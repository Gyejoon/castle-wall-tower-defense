import type { MapLayout } from '@gld/shared';
import type Phaser from 'phaser';
import type { GridManager } from './GridManager';

const STRUCTURE_DEPTH_BASE = 3;

export class StructureSystem {
	private images: Phaser.GameObjects.Image[] = [];

	constructor(
		private scene: Phaser.Scene,
		private grid: GridManager,
	) {}

	spawnFromMap(map: MapLayout): void {
		for (const spec of map.structures) {
			const world = this.grid.gridToWorld(spec.position.x, spec.position.y);
			// Use image (not sprite with frame) — structure assets are single images
			const img = this.scene.add.image(world.x, world.y, spec.assetKey);
			img.setDepth(STRUCTURE_DEPTH_BASE + spec.position.x + spec.position.y);
			img.setOrigin(0.5, 0.8);
			this.images.push(img);
		}
	}

	destroy(): void {
		for (const img of this.images) img.destroy();
		this.images = [];
	}
}
