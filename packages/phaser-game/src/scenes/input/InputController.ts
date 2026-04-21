import { PHASER_COLORS } from '@gld/shared';
import type Phaser from 'phaser';
import type { GridManager } from '../../systems/GridManager';
import type { TowerSystem } from '../../systems/TowerSystem';

export interface InputControllerDeps {
	/**
	 * The hover-highlight graphics layer. Owned by RangeOverlayController,
	 * passed in here so pointer-move can paint into it. We deliberately do
	 * NOT take ownership of the destroy lifecycle — RangeOverlayController
	 * still calls `.destroy()` on it during teardown.
	 */
	hoverGraphics: Phaser.GameObjects.Graphics;
	/** Emitted on pointerdown when a tower def is selected (Phase A summon UI is a selection too). */
	onPlace: (col: number, row: number, defId: string) => void;
	/**
	 * Emitted on pointerdown when the click lands on an existing tower.
	 * The col/row are the clicked grid coords — the tower payload is
	 * whatever `getTowerAt` returned (callers typically forward def +
	 * tier into a `tower-selected` event).
	 */
	onSelectTower: (
		col: number,
		row: number,
		tower: NonNullable<ReturnType<TowerSystem['getTowerAt']>>,
	) => void;
	/** Emitted on pointerdown on an empty tile with no active selection. */
	onDeselect: () => void;
	/** Emitted when a move-mode click resolves (success or failure handled by callback). */
	onMoveCommit: (
		from: { col: number; row: number },
		to: { col: number; row: number },
	) => void;
	/** Accessor for the scene's gameOver flag; pointerdown is a no-op when true. */
	isGameOver: () => boolean;
	/** Look up an existing tower at a grid cell for pointerdown dispatch. */
	getTowerAt: (col: number, row: number) => ReturnType<TowerSystem['getTowerAt']>;
}

/**
 * Owns scene pointer-event handling. Extracted from `Game.ts.setupInput`
 * in Phase 5. Also owns the `selectedTowerId` + `movePending` state that
 * was previously on the scene — those fields are pointer-lifecycle only,
 * so keeping them here removes two scene fields.
 */
export class InputController {
	private selectedTowerId: string | null = null;
	private movePending: { fromCol: number; fromRow: number } | null = null;
	private pointerMove?: (pointer: Phaser.Input.Pointer) => void;
	private pointerDown?: (pointer: Phaser.Input.Pointer) => void;

	constructor(
		private readonly scene: Phaser.Scene,
		private readonly grid: GridManager,
		private readonly deps: InputControllerDeps,
	) {}

	setup(): void {
		const { hoverGraphics } = this.deps;

		this.pointerMove = (pointer: Phaser.Input.Pointer) => {
			const gridPos = this.grid.worldToGrid(pointer.worldX, pointer.worldY);
			hoverGraphics.clear();

			if (this.grid.isInBounds(gridPos.x, gridPos.y)) {
				const canPlace = this.grid.canPlaceTower(gridPos.x, gridPos.y);
				this.grid.fillTileRect(
					hoverGraphics,
					gridPos.x,
					gridPos.y,
					canPlace ? PHASER_COLORS.accent : PHASER_COLORS.danger,
					0.2,
				);
			}
		};

		this.pointerDown = (pointer: Phaser.Input.Pointer) => {
			const gridPos = this.grid.worldToGrid(pointer.worldX, pointer.worldY);

			if (this.deps.isGameOver()) return;
			if (!this.grid.isInBounds(gridPos.x, gridPos.y)) return;

			// Pending move commit — callback owns the actual move + any
			// tower-moved / move-failed event emission.
			if (this.movePending) {
				const { fromCol, fromRow } = this.movePending;
				this.movePending = null;
				this.deps.onMoveCommit(
					{ col: fromCol, row: fromRow },
					{ col: gridPos.x, row: gridPos.y },
				);
				return;
			}

			if (this.selectedTowerId) {
				this.deps.onPlace(gridPos.x, gridPos.y, this.selectedTowerId);
				return;
			}

			const tower = this.deps.getTowerAt(gridPos.x, gridPos.y);
			if (tower) {
				this.deps.onSelectTower(gridPos.x, gridPos.y, tower);
			} else {
				this.deps.onDeselect();
			}
		};

		this.scene.input.on('pointermove', this.pointerMove);
		this.scene.input.on('pointerdown', this.pointerDown);
	}

	setSelectedTowerId(id: string | null): void {
		this.selectedTowerId = id;
	}

	getSelectedTowerId(): string | null {
		return this.selectedTowerId;
	}

	setMovePending(pending: { fromCol: number; fromRow: number } | null): void {
		this.movePending = pending;
	}

	destroy(): void {
		if (this.pointerMove) {
			this.scene.input?.off?.('pointermove', this.pointerMove);
			this.pointerMove = undefined;
		}
		if (this.pointerDown) {
			this.scene.input?.off?.('pointerdown', this.pointerDown);
			this.pointerDown = undefined;
		}
	}
}
