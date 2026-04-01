import { describe, expect, it, vi } from 'vitest';
import { TowerDragController } from '../src/input/TowerDragController';

type DragHandler = (...args: unknown[]) => void;

function createSprite(x = 100, y = 120) {
	const handlers = new Map<string, DragHandler>();
	const sprite = {
		x,
		y,
		alpha: 1,
		scene: {},
		on: vi.fn((event: string, handler: DragHandler) => {
			handlers.set(event, handler);
			return sprite;
		}),
		off: vi.fn((event: string, handler: DragHandler) => {
			if (handlers.get(event) === handler) {
				handlers.delete(event);
			}
			return sprite;
		}),
		setAlpha: vi.fn((value: number) => {
			sprite.alpha = value;
			return sprite;
		}),
		emitDrag(event: string, ...args: unknown[]) {
			const handler = handlers.get(event);
			if (handler) {
				handler(...args);
			}
		},
	};
	return sprite;
}

describe('TowerDragController', () => {
	it('sync registers drag behavior for newly placed towers once', () => {
		const sprite = createSprite();
		const dragBehavior = { destroy: vi.fn() };
		const dragPlugin = {
			add: vi.fn(() => dragBehavior),
		};
		const towerSystem = {
			getTowers: vi.fn(() => [
				{ instanceId: 'tower_1', position: { x: 2, y: 3 } },
			]),
			getTowerSprite: vi.fn(() => sprite),
		};

		const controller = new TowerDragController({
			dragPlugin,
			gridManager: { worldToGrid: vi.fn() },
			towerSystem,
			onDrop: vi.fn(),
			onPreview: vi.fn(),
		});

		controller.sync();
		controller.sync();

		expect(dragPlugin.add).toHaveBeenCalledTimes(1);
		expect(towerSystem.getTowerSprite).toHaveBeenCalledWith('tower_1');
	});

	it('dragend reports merge candidates and restores the dragged sprite position', () => {
		const sprite = createSprite(140, 180);
		const dragBehavior = { destroy: vi.fn() };
		const dragPlugin = {
			add: vi.fn(() => dragBehavior),
		};
		const onDrop = vi.fn();
		const onPreview = vi.fn();
		const towerSystem = {
			getTowers: vi.fn(() => [
				{ instanceId: 'tower_1', position: { x: 2, y: 3 } },
			]),
			getTowerSprite: vi.fn(() => sprite),
		};
		const gridManager = {
			worldToGrid: vi
				.fn()
				.mockReturnValueOnce({ x: 5, y: 6 })
				.mockReturnValueOnce({ x: 7, y: 8 }),
		};

		const controller = new TowerDragController({
			dragPlugin,
			gridManager,
			towerSystem,
			onDrop,
			onPreview,
		});

		controller.sync();

		sprite.emitDrag('dragstart', { worldX: 210, worldY: 240 }, 210, 240);
		sprite.x = 210;
		sprite.y = 240;
		sprite.emitDrag('drag', { worldX: 320, worldY: 350 }, 320, 350);
		sprite.emitDrag('dragend', { worldX: 320, worldY: 350 }, 320, 350, true);

		expect(onPreview).toHaveBeenCalledWith({
			fromPos: { x: 2, y: 3 },
			gridPos: { x: 5, y: 6 },
		});
		expect(onDrop).toHaveBeenCalledWith({
			fromPos: { x: 2, y: 3 },
			toPos: { x: 7, y: 8 },
		});
		expect(sprite.x).toBe(140);
		expect(sprite.y).toBe(180);
		expect(sprite.setAlpha).toHaveBeenNthCalledWith(1, 0.72);
		expect(sprite.setAlpha).toHaveBeenLastCalledWith(1);
	});
});
