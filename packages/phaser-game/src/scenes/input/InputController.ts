import { PHASER_COLORS } from '@gld/shared';
import type Phaser from 'phaser';
import type { GridManager } from '../../systems/GridManager';
import type { TowerSystem } from '../../systems/TowerSystem';

export interface InputControllerDeps {
	// RangeOverlayController가 소유·해제. 여기서는 그리기만 하고 lifecycle은 건드리지 않는다.
	hoverGraphics: Phaser.GameObjects.Graphics;
	onPlace: (col: number, row: number, defId: string) => void;
	onSelectTower: (
		col: number,
		row: number,
		tower: NonNullable<ReturnType<TowerSystem['getTowerAt']>>,
	) => void;
	onDeselect: () => void;
	onMoveCommit: (
		from: { col: number; row: number },
		to: { col: number; row: number },
	) => void;
	isGameOver: () => boolean;
	getTowerAt: (
		col: number,
		row: number,
	) => ReturnType<TowerSystem['getTowerAt']>;
}

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
			const gridPos = this.pointerToGrid(pointer);
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
			const gridPos = this.pointerToGrid(pointer);

			if (this.deps.isGameOver()) return;
			if (!this.grid.isInBounds(gridPos.x, gridPos.y)) return;

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

	private pointerToGrid(pointer: Phaser.Input.Pointer): {
		x: number;
		y: number;
	} {
		return (
			this.grid.snapWorldToBuildable(pointer.worldX, pointer.worldY) ??
			this.grid.worldToGrid(pointer.worldX, pointer.worldY)
		);
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
