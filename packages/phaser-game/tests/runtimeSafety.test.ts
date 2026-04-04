import { TOTAL_WAVES, WAVE_DEFS } from '@gld/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundGenerator } from '../src/audio/SoundGenerator';

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
		Game: class {},
		Geom: {
			Point: class {
				constructor(
					public x: number,
					public y: number,
				) {}
			},
		},
		Scene: class {
			constructor(_key?: string) {}
		},
		Scale: {
			FIT: 'FIT',
			CENTER_HORIZONTALLY: 'CENTER_HORIZONTALLY',
		},
	},
}));

vi.mock('../src/EventBus', () => ({
	EventBus: {
		emit: vi.fn(),
	},
}));

import { EventBus } from '../src/EventBus';
import { UnitSystem } from '../src/systems/UnitSystem';
import { WaveSystem } from '../src/systems/WaveSystem';

class LocalStorageMock implements Storage {
	private store = new Map<string, string>();

	get length(): number {
		return this.store.size;
	}

	clear(): void {
		this.store.clear();
	}

	getItem(key: string): string | null {
		return this.store.get(key) ?? null;
	}

	key(index: number): string | null {
		return Array.from(this.store.keys())[index] ?? null;
	}

	removeItem(key: string): void {
		this.store.delete(key);
	}

	setItem(key: string, value: string): void {
		this.store.set(key, value);
	}
}

describe('runtime safety fixes', () => {
	beforeEach(() => {
		vi.stubGlobal('localStorage', new LocalStorageMock());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('clamps max waves to the supported wave definitions', () => {
		const unitSystem = {
			queueUnits: vi.fn(),
			hasActiveUnits: vi.fn(() => false),
			hasQueuedUnits: vi.fn(() => false),
			getActiveCount: vi.fn(() => 0),
		};

		const waveSystem = new WaveSystem(
			unitSystem as never,
			WAVE_DEFS.length + 5,
		);
		expect((waveSystem as { maxWaves: number }).maxWaves).toBe(TOTAL_WAVES);

		waveSystem.setMaxWaves(0);
		expect((waveSystem as { maxWaves: number }).maxWaves).toBe(1);

		waveSystem.setMaxWaves(WAVE_DEFS.length + 10);
		expect((waveSystem as { maxWaves: number }).maxWaves).toBe(TOTAL_WAVES);
	});

	it('event-based wave progression: start → clear → wait → next wave', () => {
		const unitSystem = {
			queueUnits: vi.fn(),
			hasActiveUnits: vi.fn(() => false),
			hasQueuedUnits: vi.fn(() => false),
			getActiveCount: vi.fn(() => 0),
		};

		const emitSpy = vi.spyOn(EventBus, 'emit');
		const waveSystem = new WaveSystem(unitSystem as never);
		waveSystem.start();

		// Wave 1 starts immediately
		expect(emitSpy).toHaveBeenCalledWith(
			'wave-started',
			expect.objectContaining({
				slotIndex: 1,
				phase: 'combat',
				kind: 'normal',
			}),
		);

		// Simulate units alive (activeCount > 0)
		unitSystem.getActiveCount.mockReturnValue(5);
		waveSystem.update(1000, 5);
		expect(waveSystem.getPhase()).toBe('combat');

		// Units cleared → transitions to waiting
		unitSystem.getActiveCount.mockReturnValue(0);
		waveSystem.update(100, 0);
		expect(waveSystem.getPhase()).toBe('waiting');

		// Wait through delay (3000ms for normal waves)
		waveSystem.update(3100, 0);
		expect(emitSpy).toHaveBeenCalledWith(
			'wave-started',
			expect.objectContaining({
				slotIndex: 2,
				kind: 'normal',
			}),
		);
	});

	it('emits boss-warning when pre_boss wave is cleared', () => {
		const unitSystem = {
			queueUnits: vi.fn(),
			hasActiveUnits: vi.fn(() => false),
			hasQueuedUnits: vi.fn(() => false),
			getActiveCount: vi.fn(() => 0),
		};

		const emitSpy = vi.spyOn(EventBus, 'emit');
		const waveSystem = new WaveSystem(unitSystem as never);
		waveSystem.start();

		// Advance through waves 1-3 (clear immediately since activeCount=0)
		for (let i = 0; i < 3; i++) {
			waveSystem.update(100, 0); // clear current wave
			waveSystem.update(3100, 0); // wait through delay
		}

		// Now on wave 4 (pre_boss). Clear it.
		waveSystem.update(100, 0);

		expect(emitSpy).toHaveBeenCalledWith(
			'boss-warning',
			expect.objectContaining({
				slotIndex: 4,
				bossSlotIndex: 5,
			}),
		);
	});

	it('disconnects audio nodes once playback ends', () => {
		const oscillator = {
			type: 'sine' as OscillatorType,
			frequency: {
				setValueAtTime: vi.fn(),
				linearRampToValueAtTime: vi.fn(),
			},
			connect: vi.fn(),
			disconnect: vi.fn(),
			start: vi.fn(),
			stop: vi.fn(),
			onended: null as null | (() => void),
		};
		const gainNode = {
			gain: {
				setValueAtTime: vi.fn(),
				linearRampToValueAtTime: vi.fn(),
			},
			connect: vi.fn(),
			disconnect: vi.fn(),
		};

		class MockAudioContext {
			currentTime = 0;
			destination = {};

			createOscillator() {
				return oscillator;
			}

			createGain() {
				return gainNode;
			}

			createDynamicsCompressor() {
				return {
					threshold: { setValueAtTime: vi.fn() },
					knee: { setValueAtTime: vi.fn() },
					ratio: { setValueAtTime: vi.fn() },
					connect: vi.fn(),
					disconnect: vi.fn(),
				};
			}
		}

		vi.stubGlobal('AudioContext', MockAudioContext);

		const generator = new SoundGenerator();
		generator.play({
			frequency: 440,
			duration: 100,
			type: 'sine',
			volume: 0.2,
		});

		expect(oscillator.onended).toBeTypeOf('function');
		oscillator.onended?.();

		expect(oscillator.disconnect).toHaveBeenCalledOnce();
		expect(gainNode.disconnect).toHaveBeenCalledOnce();
	});

	it('emits unit-spawned when a queued unit actually spawns', () => {
		const scene = {
			add: {
				sprite: vi.fn(() => ({
					setDisplaySize: vi.fn(),
					play: vi.fn(),
					setDepth: vi.fn(),
					setPosition: vi.fn(),
					destroy: vi.fn(),
					setTint: vi.fn(),
					clearTint: vi.fn(),
				})),
				graphics: vi.fn(() => ({
					clear: vi.fn(),
					fillStyle: vi.fn(),
					fillRect: vi.fn(),
					destroy: vi.fn(),
				})),
			},
		};

		const gridManager = {
			orthoTile: 48,
			gridToWorld: vi.fn((x: number, y: number) => ({ x, y })),
			worldToGrid: vi.fn((x: number, y: number) => ({
				x: Math.floor(x),
				y: Math.floor(y),
			})),
			worldToGridFloat: vi.fn((x: number, y: number) => ({ x, y })),
			getDepth: vi.fn((_x: number, _y: number) => 10),
		};

		const emitSpy = vi.spyOn(EventBus, 'emit');
		const unitSystem = new UnitSystem(scene as never, gridManager as never);
		unitSystem.setPath([
			{ x: 0, y: 0 },
			{ x: 1, y: 0 },
		]);

		unitSystem.queueUnits('scout_drone', 1);

		expect(emitSpy).not.toHaveBeenCalledWith('unit-spawned', expect.anything());

		unitSystem.update(0, 300);

		expect(emitSpy).toHaveBeenCalledWith('unit-spawned', {
			unitType: 'scout_drone',
			count: 1,
		});
	});
});
