import { MAIN_LONG_MAP } from '@gld/shared';
import { describe, expect, it, vi } from 'vitest';
import {
	TINY_SWORDS_DECORATION_ASSETS,
	TINY_SWORDS_PRIMARY_TILESET,
} from '../src/fieldAssets';

const { waveSystemCtorSpy } = vi.hoisted(() => ({
	waveSystemCtorSpy: vi.fn(),
}));

vi.mock('../src/systems/WaveSystem', () => ({
	WaveSystem: class {
		constructor(...args: unknown[]) {
			waveSystemCtorSpy(...args);
		}
		start() {}
		update() {}
		destroy() {}
		getElapsedMs() {
			return 0;
		}
		getPhase() {
			return 'combat';
		}
	},
}));

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
		setAlpha: vi.fn().mockReturnThis(),
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
		strokeCircle: vi.fn().mockReturnThis(),
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
		setTexture: vi.fn().mockReturnThis(),
		setVisible: vi.fn().mockReturnThis(),
		setCrop: vi.fn().mockReturnThis(),
		clearTint: vi.fn().mockReturnThis(),
		play: vi.fn().mockReturnThis(),
		anims: { pause: vi.fn(), resume: vi.fn(), isPlaying: false },
		destroy: vi.fn(),
	};
}

function createText() {
	return {
		setOrigin: vi.fn().mockReturnThis(),
		setDepth: vi.fn().mockReturnThis(),
		setInteractive: vi.fn().mockReturnThis(),
		setAlpha: vi.fn().mockReturnThis(),
		setVisible: vi.fn().mockReturnThis(),
		setScale: vi.fn().mockReturnThis(),
		setColor: vi.fn().mockReturnThis(),
		setPosition: vi.fn().mockReturnThis(),
		setText: vi.fn().mockReturnThis(),
		setY: vi.fn().mockReturnThis(),
		on: vi.fn().mockReturnThis(),
		destroy: vi.fn(),
	};
}

describe('GameScene field runtime', () => {
	it('loads the endless wave set on scene create', async () => {
		waveSystemCtorSpy.mockClear();
		const addSprite = vi.fn(() => createImage());
		const addGraphics = vi.fn(() => createGraphics());
		const addText = vi.fn(() => createText());
		const tilemapData = {
			getObjectLayer: vi.fn(() => ({ objects: [] })),
		};
		const makeTilemap = vi.fn(() => tilemapData);

		const { GameScene } = await import('../src/scenes/Game');
		const scene = new GameScene();

		Object.assign(scene, {
			game: {
				registry: {
					get: vi.fn((key: string) => {
						if (key === 'selectedStageId') return 'w1_s2';
						if (key === 'selectedStar') return 1;
						return undefined;
					}),
					set: vi.fn(),
					events: { on: vi.fn() },
				},
			},
			scale: { width: 424, height: 960 },
			add: {
				image: vi.fn(() => createImage()),
				sprite: addSprite,
				graphics: addGraphics,
				text: addText,
				rectangle: vi.fn(() => ({ setDepth: vi.fn(), destroy: vi.fn() })),
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
			time: { timeScale: 1 },
			anims: {
				globalTimeScale: 1,
				exists: vi.fn(() => false),
				create: vi.fn(),
				generateFrameNumbers: vi.fn(() => []),
			},
			tweens: { add: vi.fn(), addCounter: vi.fn() },
			cameras: { main: { shake: vi.fn() } },
			scene: { pause: vi.fn(), resume: vi.fn() },
		});

		scene.create();

		const waveDefs = waveSystemCtorSpy.mock.calls[0]?.[1] as Array<{
			slotIndex: number;
			kind: string;
			groups: Array<{ unitId: string; count: number }>;
		}>;
		// 정식 모드 endless set: 50 waves total, first wave is 30 scout_drone
		expect(waveDefs).toHaveLength(50);
		expect(waveDefs?.[0]?.slotIndex).toBe(1);
		expect(waveDefs?.[0]?.groups).toEqual([
			{ unitId: 'scout_drone', count: 30 },
		]);
	});

	it('renders a single portrait field from raw field assets', async () => {
		const addImage = vi.fn(() => createImage());
		const addSprite = vi.fn(() => createImage());
		const addGraphics = vi.fn(() => createGraphics());
		const addText = vi.fn(() => createText());
		const tilemapData = {
			getObjectLayer: vi.fn(() => ({
				objects: [
					{
						x: MAIN_LONG_MAP.tileSize * 4,
						y: MAIN_LONG_MAP.tileSize * 1,
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
			game: {
				registry: {
					get: vi.fn(() => undefined),
					set: vi.fn(),
					events: { on: vi.fn() },
				},
			},
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
			time: { timeScale: 1 },
			anims: {
				globalTimeScale: 1,
				exists: vi.fn(() => false),
				create: vi.fn(),
				generateFrameNumbers: vi.fn(() => []),
			},
			tweens: { add: vi.fn(), addCounter: vi.fn() },
		});

		scene.create();

		expect(makeTilemap).toHaveBeenCalledWith({
			key: MAIN_LONG_MAP.tilemapKey,
		});

		const spriteKeys = addSprite.mock.calls.map((call) => call[2]);

		// Elevated grass platform tiles rendered using Tiny Swords tileset
		// (path cells are skipped — dirt tileSprite covers those).
		const platformTileCount = spriteKeys.filter(
			(k) => k === TINY_SWORDS_PRIMARY_TILESET.key,
		).length;
		expect(platformTileCount).toBeGreaterThan(0);

		const decorationCount = spriteKeys.filter(
			(k) => k === TINY_SWORDS_DECORATION_ASSETS[0].key,
		).length;
		expect(decorationCount).toBe(1);

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

	it('uses recognized tiled visual layers during scene create when available', async () => {
		const addSprite = vi.fn(() => createImage());
		const addGraphics = vi.fn(() => createGraphics());
		const addText = vi.fn(() => createText());
		const addTileSprite = vi.fn(() => ({
			setDepth: vi.fn().mockReturnThis(),
			setScrollFactor: vi.fn().mockReturnThis(),
			setTint: vi.fn().mockReturnThis(),
		}));
		const tilemapData = {
			getLayer: vi.fn((name: string) => {
				if (
					name === 'ground_base' ||
					name === 'platform_high' ||
					name === 'cliff_faces'
				) {
					return {
						layer: {
							name,
							type: 'tilelayer',
							width: MAIN_LONG_MAP.width,
							height: MAIN_LONG_MAP.height,
							visible: true,
							alpha: 1,
						},
					};
				}
				return null;
			}),
			getObjectLayer: vi.fn(() => ({ objects: [] })),
		};
		const makeTilemap = vi.fn(() => tilemapData);

		const { GameScene } = await import('../src/scenes/Game');
		const scene = new GameScene();

		Object.assign(scene, {
			game: {
				registry: {
					get: vi.fn(() => undefined),
					set: vi.fn(),
					events: { on: vi.fn() },
				},
			},
			scale: { width: 424, height: 960 },
			add: {
				sprite: addSprite,
				graphics: addGraphics,
				text: addText,
				tileSprite: addTileSprite,
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
			time: { timeScale: 1 },
			anims: {
				globalTimeScale: 1,
				exists: vi.fn(() => false),
				create: vi.fn(),
				generateFrameNumbers: vi.fn(() => []),
			},
			tweens: { add: vi.fn(), addCounter: vi.fn() },
		});

		scene.create();

		expect(tilemapData.getLayer).toHaveBeenCalledWith('ground_base');
		expect(tilemapData.getLayer).toHaveBeenCalledWith('platform_high');
		expect(tilemapData.getObjectLayer).toHaveBeenCalledWith('decorations');
	});

	it('keeps the procedural field fallback when recognized tiled layers are absent', async () => {
		const addSprite = vi.fn(() => createImage());
		const addGraphics = vi.fn(() => createGraphics());
		const addText = vi.fn(() => createText());
		const addTileSprite = vi.fn(() => ({
			setDepth: vi.fn().mockReturnThis(),
			setScrollFactor: vi.fn().mockReturnThis(),
			setTint: vi.fn().mockReturnThis(),
		}));
		const tilemapData = {
			getLayer: vi.fn(() => null),
			getObjectLayer: vi.fn(() => ({ objects: [] })),
		};
		const makeTilemap = vi.fn(() => tilemapData);

		const { GameScene } = await import('../src/scenes/Game');
		const scene = new GameScene();

		Object.assign(scene, {
			game: {
				registry: {
					get: vi.fn(() => undefined),
					set: vi.fn(),
					events: { on: vi.fn() },
				},
			},
			scale: { width: 424, height: 960 },
			add: {
				sprite: addSprite,
				graphics: addGraphics,
				text: addText,
				tileSprite: addTileSprite,
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
			time: { timeScale: 1 },
			anims: {
				globalTimeScale: 1,
				exists: vi.fn(() => false),
				create: vi.fn(),
				generateFrameNumbers: vi.fn(() => []),
			},
			tweens: { add: vi.fn(), addCounter: vi.fn() },
		});

		scene.create();

		expect(tilemapData.getLayer).toHaveBeenCalledWith('ground_base');
		expect(tilemapData.getLayer).toHaveBeenCalledWith('platform_high');
		expect(addTileSprite).toHaveBeenCalledWith(
			212,
			480,
			424,
			960,
			'grass-seamless',
		);
		expect(addTileSprite).toHaveBeenCalledWith(
			expect.any(Number),
			expect.any(Number),
			expect.any(Number),
			expect.any(Number),
			'dirt-seamless',
		);
		expect(addSprite).toHaveBeenCalledWith(
			expect.any(Number),
			expect.any(Number),
			TINY_SWORDS_PRIMARY_TILESET.key,
			expect.any(Number),
		);
	});
});
