import { FOREST_GATE_MAP } from '@gld/shared';
import { describe, expect, it, vi } from 'vitest';
import {
	TINY_SWORDS_DECORATION_ASSETS,
	TINY_SWORDS_PRIMARY_TILESET,
} from '../src/fieldAssets';

vi.mock('phaser', () => ({
	Events: {
		EventEmitter: class {
			on() {
				return this;
			}

			off() {
				return this;
			}

			emit() {
				return true;
			}

			removeAllListeners() {
				return this;
			}
		},
	},
	default: {
		AUTO: 'AUTO',
		Animations: {
			Events: {
				ANIMATION_COMPLETE: 'animationcomplete',
			},
		},
		Events: {
			EventEmitter: class {
				on() {
					return this;
				}

				off() {
					return this;
				}

				emit() {
					return true;
				}

				removeAllListeners() {
					return this;
				}
			},
		},
		Game: class {},
		Scene: class {
			add: unknown;
			make: unknown;
			input: unknown;
			events = { on: vi.fn() };
		},
		Geom: {
			Point: class {
				constructor(
					public x: number,
					public y: number,
				) {}
			},
		},
		Scale: {
			FIT: 'FIT',
			CENTER_HORIZONTALLY: 'CENTER_HORIZONTALLY',
		},
	},
}));

function createGraphics() {
	return {
		setDepth: vi.fn().mockReturnThis(),
		clear: vi.fn().mockReturnThis(),
		fillStyle: vi.fn().mockReturnThis(),
		fillPoints: vi.fn().mockReturnThis(),
		fillRect: vi.fn().mockReturnThis(),
		lineStyle: vi.fn().mockReturnThis(),
		beginPath: vi.fn().mockReturnThis(),
		moveTo: vi.fn().mockReturnThis(),
		lineTo: vi.fn().mockReturnThis(),
		strokePath: vi.fn().mockReturnThis(),
		fillCircle: vi.fn().mockReturnThis(),
		destroy: vi.fn(),
	};
}

function createImage() {
	return {
		setDisplaySize: vi.fn().mockReturnThis(),
		setDepth: vi.fn().mockReturnThis(),
		setAlpha: vi.fn().mockReturnThis(),
		setOrigin: vi.fn().mockReturnThis(),
		setTint: vi.fn().mockReturnThis(),
		setCrop: vi.fn().mockReturnThis(),
		destroy: vi.fn(),
	};
}

function createText() {
	return {
		setOrigin: vi.fn().mockReturnThis(),
		setDepth: vi.fn().mockReturnThis(),
		setInteractive: vi.fn().mockReturnThis(),
		setAlpha: vi.fn().mockReturnThis(),
		setText: vi.fn().mockReturnThis(),
		on: vi.fn().mockReturnThis(),
		destroy: vi.fn(),
	};
}

describe('GameScene field runtime', () => {
	it('renders a single portrait field from raw Tiny Swords assets', async () => {
		const addImage = vi.fn(() => createImage());
		const addSprite = vi.fn(() => createImage());
		const addGraphics = vi.fn(() => createGraphics());
		const addText = vi.fn(() => createText());
		const tilemapData = {
			getObjectLayer: vi.fn(() => ({
				objects: [
					{
						x: FOREST_GATE_MAP.tileSize * 4,
						y: FOREST_GATE_MAP.tileSize * 1,
						properties: [
							{ name: 'kind', value: TINY_SWORDS_DECORATION_ASSETS[0].kind },
							{ name: 'assetKey', value: TINY_SWORDS_DECORATION_ASSETS[0].key },
							{
								name: 'variant',
								value: TINY_SWORDS_DECORATION_ASSETS[0].variant,
							},
						],
					},
				],
			})),
		};
		const makeTilemap = vi.fn(() => tilemapData);

		const { GameScene } = await import('../src/scenes/Game');
		const scene = new GameScene();

		Object.assign(scene, {
			game: { registry: { get: vi.fn(() => undefined), set: vi.fn() } },
			scale: { width: 424, height: 960 },
			add: {
				image: addImage,
				sprite: addSprite,
				graphics: addGraphics,
				text: addText,
			},
			cache: {
				json: {
					get: vi.fn(() => ({
						generated: '2026-04-02T00:00:00.000Z',
						assets: [],
					})),
				},
				tilemap: {
					exists: vi.fn(() => false),
					remove: vi.fn(),
				},
			},
			load: {
				image: vi.fn(),
				spritesheet: vi.fn(),
				tilemapTiledJSON: vi.fn(),
				once: vi.fn((_event: string, callback: () => void) => callback()),
				start: vi.fn(),
			},
			textures: {
				exists: vi.fn(() => false),
				remove: vi.fn(),
			},
			make: {
				tilemap: makeTilemap,
			},
			input: {
				on: vi.fn(),
				setDraggable: vi.fn(),
			},
			events: {
				on: vi.fn(),
			},
		});

		scene.create();

		const spriteKeys = addSprite.mock.calls.map((call) => call[2]);

		const floorCount = spriteKeys.filter(
			(k) => k === TINY_SWORDS_PRIMARY_TILESET.key,
		).length;
		expect(floorCount).toBe(FOREST_GATE_MAP.width * FOREST_GATE_MAP.height);

		const decorationCount = spriteKeys.filter(
			(k) => k === TINY_SWORDS_DECORATION_ASSETS[0].key,
		).length;
		expect(decorationCount).toBe(1);

		expect(addText.mock.calls.length).toBeGreaterThanOrEqual(3);
		expect(addImage).not.toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			'grid-floor',
		);
		expect(addImage).not.toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			'path-tile',
		);
	});
});
