import { type MapLayout, PHASER_COLORS } from '@gld/shared';
import type Phaser from 'phaser';
import { PLATFORM_LIFT } from '../../fieldAssets';
import type { GridManager } from '../../systems/GridManager';

function getPlacementVisualLift(grid: GridManager): number {
	return grid.hasPlacementAnchors() ? 0 : grid.orthoTile * PLATFORM_LIFT;
}

export class RangeOverlayController {
	private hoverGraphics: Phaser.GameObjects.Graphics;
	private selectionGraphics: Phaser.GameObjects.Graphics;
	private rangeOverlayGraphics: Phaser.GameObjects.Graphics;
	private buildableZoneGraphics?: Phaser.GameObjects.Graphics;

	constructor(
		private readonly scene: Phaser.Scene,
		private readonly grid: GridManager,
		private readonly map: MapLayout,
	) {
		this.hoverGraphics = scene.add.graphics();
		this.selectionGraphics = scene.add.graphics();
		this.selectionGraphics.setDepth(15);
		this.rangeOverlayGraphics = scene.add.graphics();
		this.rangeOverlayGraphics.setDepth(22);
		this.rangeOverlayGraphics.setAlpha(0);
	}

	getHoverGraphics(): Phaser.GameObjects.Graphics {
		return this.hoverGraphics;
	}

	getSelectionGraphics(): Phaser.GameObjects.Graphics {
		return this.selectionGraphics;
	}

	getRangeOverlayGraphics(): Phaser.GameObjects.Graphics {
		return this.rangeOverlayGraphics;
	}

	clearSelection(): void {
		this.selectionGraphics.clear();
	}

	clearHover(): void {
		this.hoverGraphics.clear();
	}

	drawRangeOverlay(col: number, row: number, range: number): void {
		this.rangeOverlayGraphics.clear();
		this.scene.tweens.killTweensOf(this.rangeOverlayGraphics);
		const worldPos = this.grid.gridToWorld(col, row);
		const radius = range * this.grid.tileSize;

		this.rangeOverlayGraphics.fillStyle(PHASER_COLORS.gold, 0.08);
		this.rangeOverlayGraphics.fillCircle(worldPos.x, worldPos.y, radius);
		this.rangeOverlayGraphics.lineStyle(2, PHASER_COLORS.gold, 0.6);
		this.rangeOverlayGraphics.strokeCircle(worldPos.x, worldPos.y, radius);

		this.rangeOverlayGraphics.setAlpha(0);
		this.scene.tweens.add({
			targets: this.rangeOverlayGraphics,
			alpha: 1,
			duration: 120,
			ease: 'Quad.easeOut',
		});
	}

	clearRangeOverlay(): void {
		this.scene.tweens.killTweensOf(this.rangeOverlayGraphics);
		this.scene.tweens.add({
			targets: this.rangeOverlayGraphics,
			alpha: 0,
			duration: 60,
			ease: 'Quad.easeIn',
			onComplete: () => this.rangeOverlayGraphics.clear(),
		});
	}

	showBuildableZone(selectedTowerId: string | null): void {
		if (!this.buildableZoneGraphics) {
			this.buildableZoneGraphics = this.scene.add.graphics();
			this.buildableZoneGraphics.setDepth(3);
		}
		this.buildableZoneGraphics.clear();
		if (!selectedTowerId) return;

		const tile = this.grid.orthoTile;
		const lift = getPlacementVisualLift(this.grid);
		for (const point of this.map.buildablePoints) {
			if (!this.grid.canPlaceTower(point.x, point.y)) continue;
			const world = this.grid.gridToWorld(point.x, point.y);
			this.buildableZoneGraphics.fillStyle(0x44ff44, 0.15);
			this.buildableZoneGraphics.fillRect(
				world.x - tile / 2,
				world.y - lift - tile / 2,
				tile,
				tile,
			);
			this.buildableZoneGraphics.lineStyle(1, 0x44ff44, 0.3);
			this.buildableZoneGraphics.strokeRect(
				world.x - tile / 2,
				world.y - lift - tile / 2,
				tile,
				tile,
			);
		}
	}

	hideBuildableZone(): void {
		if (this.buildableZoneGraphics) this.buildableZoneGraphics.clear();
	}

	renderPlaceableHighlights(selectedTowerId: string | null): void {
		this.selectionGraphics.clear();
		if (!selectedTowerId) return;

		for (let y = 0; y < this.map.height; y++) {
			for (let x = 0; x < this.map.width; x++) {
				if (this.grid.canPlaceTower(x, y)) {
					this.grid.fillTileRect(
						this.selectionGraphics,
						x,
						y,
						PHASER_COLORS.accent,
						0.12,
					);
				}
			}
		}
	}

	destroy(): void {
		this.hoverGraphics.destroy();
		this.selectionGraphics.destroy();
		this.rangeOverlayGraphics.destroy();
		this.buildableZoneGraphics?.destroy();
		this.buildableZoneGraphics = undefined;
	}
}
