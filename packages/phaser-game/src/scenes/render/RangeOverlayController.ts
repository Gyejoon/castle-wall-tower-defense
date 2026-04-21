import { type MapLayout, PHASER_COLORS } from '@gld/shared';
import type Phaser from 'phaser';
import { PLATFORM_LIFT } from '../../fieldAssets';
import type { GridManager } from '../../systems/GridManager';

/**
 * Owns the four Graphics objects used to visualize tower selection,
 * placement hover, range rings, and the buildable-zone highlight.
 *
 * Extracted from Game.ts (Phase 4 refactor). Game.ts used to hold each
 * of these Graphics objects on `this.*` and drew into them from inline
 * helpers; this class centralizes ownership and destruction.
 */
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

	/** Expose the hover graphics so the scene input handler can paint into it. */
	getHoverGraphics(): Phaser.GameObjects.Graphics {
		return this.hoverGraphics;
	}

	/** Expose the selection graphics for direct clear from Game.ts. */
	getSelectionGraphics(): Phaser.GameObjects.Graphics {
		return this.selectionGraphics;
	}

	/** Expose the range overlay graphics for direct clear on game over. */
	getRangeOverlayGraphics(): Phaser.GameObjects.Graphics {
		return this.rangeOverlayGraphics;
	}

	/** Clear only the selection highlight layer. */
	clearSelection(): void {
		this.selectionGraphics.clear();
	}

	/** Clear only the hover highlight layer. */
	clearHover(): void {
		this.hoverGraphics.clear();
	}

	/**
	 * Draw the gold range ring around the tower at (col, row) with the
	 * given tile-space range, fading in over 120ms.
	 */
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

	/** Fade out the range overlay, clearing the underlying graphics on complete. */
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

	/**
	 * Highlight every tile in `map.buildablePoints` that still passes
	 * `grid.canPlaceTower`. Lazily creates the underlying graphics on
	 * first call so scenes that never enter placement mode don't
	 * allocate it.
	 */
	showBuildableZone(selectedTowerId: string | null): void {
		if (!this.buildableZoneGraphics) {
			this.buildableZoneGraphics = this.scene.add.graphics();
			this.buildableZoneGraphics.setDepth(3);
		}
		this.buildableZoneGraphics.clear();
		if (!selectedTowerId) return;

		const tile = this.grid.orthoTile;
		const lift = tile * PLATFORM_LIFT;
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

	/** Clear the buildable-zone highlight; safe to call before it's created. */
	hideBuildableZone(): void {
		if (this.buildableZoneGraphics) this.buildableZoneGraphics.clear();
	}

	/**
	 * Fill every placeable tile in the map with a translucent accent tint,
	 * using GridManager.fillTileRect for consistent tile geometry.
	 */
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
