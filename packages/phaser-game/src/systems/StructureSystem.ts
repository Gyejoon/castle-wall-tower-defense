import type { MapLayout } from '@gld/shared';
import type Phaser from 'phaser';
import type { GridManager } from './GridManager';

const STRUCTURE_DEPTH_BASE = 3;

export class StructureSystem {
	private sprites: Phaser.GameObjects.Sprite[] = [];

	constructor(
		private scene: Phaser.Scene,
		private grid: GridManager,
	) {}

	spawnFromMap(map: MapLayout): void {
		for (const spec of map.structures) {
			const world = this.grid.gridToWorld(spec.position.x, spec.position.y);
			const sprite = this.scene.add.sprite(
				world.x,
				world.y,
				spec.assetKey,
				spec.variant,
			);
			sprite.setDepth(STRUCTURE_DEPTH_BASE + spec.position.x + spec.position.y);
			sprite.setOrigin(0.5, 0.8);
			this.sprites.push(sprite);
		}
	}

	destroy(): void {
		for (const s of this.sprites) s.destroy();
		this.sprites = [];
	}
}
