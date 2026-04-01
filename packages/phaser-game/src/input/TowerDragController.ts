import type { PlacedTower, Position } from '@gld/shared';
import type Phaser from 'phaser';
import type { GridManager } from '../systems/GridManager';
import type { TowerSystem } from '../systems/TowerSystem';

interface DragBehaviorLike {
	destroy?: () => void;
}

interface DragPluginLike {
	add: (
		gameObject: Phaser.GameObjects.Image,
		config?: Record<string, unknown>,
	) => DragBehaviorLike;
}

interface DragPreviewPayload {
	fromPos: Position;
	gridPos: Position;
}

interface DragDropPayload {
	fromPos: Position;
	toPos: Position;
}

interface TrackedTower {
	behavior: DragBehaviorLike;
	fromPos: Position;
	origin: { x: number; y: number };
	handlers: {
		dragstart: (
			pointer: { worldX?: number; worldY?: number } | undefined,
			dragX: number,
			dragY: number,
		) => void;
		drag: (
			pointer: { worldX?: number; worldY?: number } | undefined,
			dragX: number,
			dragY: number,
		) => void;
		dragend: (
			pointer: { worldX?: number; worldY?: number } | undefined,
			dragX: number,
			dragY: number,
			dropped: boolean,
		) => void;
	};
	sprite: Phaser.GameObjects.Image;
}

export class TowerDragController {
	private readonly dragPlugin: DragPluginLike;
	private readonly gridManager: Pick<GridManager, 'worldToGrid'>;
	private readonly towerSystem: Pick<
		TowerSystem,
		'getTowers' | 'getTowerSprite'
	>;
	private readonly canInteract?: () => boolean;
	private readonly onDrop: (payload: DragDropPayload) => void;
	private readonly onPreview: (payload: DragPreviewPayload) => void;
	private readonly tracked = new Map<string, TrackedTower>();
	private activeDragId: string | null = null;

	constructor({
		dragPlugin,
		gridManager,
		towerSystem,
		canInteract,
		onDrop,
		onPreview,
	}: {
		dragPlugin: DragPluginLike;
		gridManager: Pick<GridManager, 'worldToGrid'>;
		towerSystem: Pick<TowerSystem, 'getTowers' | 'getTowerSprite'>;
		canInteract?: () => boolean;
		onDrop: (payload: DragDropPayload) => void;
		onPreview: (payload: DragPreviewPayload) => void;
	}) {
		this.dragPlugin = dragPlugin;
		this.gridManager = gridManager;
		this.towerSystem = towerSystem;
		this.canInteract = canInteract;
		this.onDrop = onDrop;
		this.onPreview = onPreview;
	}

	isDragging(): boolean {
		return this.activeDragId !== null;
	}

	sync(): void {
		const towers = this.towerSystem.getTowers();
		const activeIds = new Set(towers.map((tower) => tower.instanceId));

		for (const [instanceId] of this.tracked) {
			if (!activeIds.has(instanceId)) {
				this.unregister(instanceId);
			}
		}

		for (const tower of towers) {
			if (this.tracked.has(tower.instanceId)) continue;
			this.register(tower);
		}
	}

	destroy(): void {
		for (const instanceId of Array.from(this.tracked.keys())) {
			this.unregister(instanceId);
		}
		this.activeDragId = null;
	}

	private register(tower: Pick<PlacedTower, 'instanceId' | 'position'>): void {
		const sprite = this.towerSystem.getTowerSprite(tower.instanceId);
		if (!sprite) return;

		const tracked: TrackedTower = {
			behavior: this.dragPlugin.add(sprite),
			fromPos: { ...tower.position },
			origin: { x: sprite.x, y: sprite.y },
			handlers: {
				dragstart: () => {
					if (this.canInteract && !this.canInteract()) {
						return;
					}
					this.activeDragId = tower.instanceId;
					tracked.origin = { x: sprite.x, y: sprite.y };
					sprite.setAlpha?.(0.72);
				},
				drag: (pointer, dragX, dragY) => {
					if (this.activeDragId !== tower.instanceId) {
						return;
					}
					const gridPos = this.gridManager.worldToGrid(
						pointer?.worldX ?? dragX,
						pointer?.worldY ?? dragY,
					);
					this.onPreview({
						fromPos: tracked.fromPos,
						gridPos,
					});
				},
				dragend: (pointer, dragX, dragY) => {
					if (this.activeDragId !== tower.instanceId) {
						return;
					}
					const toPos = this.gridManager.worldToGrid(
						pointer?.worldX ?? dragX,
						pointer?.worldY ?? dragY,
					);
					this.activeDragId = null;
					this.onDrop({
						fromPos: tracked.fromPos,
						toPos,
					});
					if (
						sprite.scene &&
						(sprite as { active?: boolean }).active !== false
					) {
						sprite.x = tracked.origin.x;
						sprite.y = tracked.origin.y;
						sprite.setAlpha?.(1);
					}
				},
			},
			sprite,
		};

		sprite.on('dragstart', tracked.handlers.dragstart);
		sprite.on('drag', tracked.handlers.drag);
		sprite.on('dragend', tracked.handlers.dragend);
		this.tracked.set(tower.instanceId, tracked);
	}

	private unregister(instanceId: string): void {
		const tracked = this.tracked.get(instanceId);
		if (!tracked) return;
		tracked.sprite.off('dragstart', tracked.handlers.dragstart);
		tracked.sprite.off('drag', tracked.handlers.drag);
		tracked.sprite.off('dragend', tracked.handlers.dragend);
		tracked.behavior.destroy?.();
		this.tracked.delete(instanceId);
		if (this.activeDragId === instanceId) {
			this.activeDragId = null;
		}
	}
}
