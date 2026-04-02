import {
	BOSS_SLOT_AT_SECS,
	BOSS_WARNING_AT_SECS,
	TOTAL_WAVES,
	WAVE_DEFS,
} from '@gld/shared';
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

	it('gstack test plan: Real-time wave scheduler emits boss warning and boss slot without build phase', () => {
		const unitSystem = {
			queueUnits: vi.fn(),
			hasActiveUnits: vi.fn(() => false),
			hasQueuedUnits: vi.fn(() => false),
		};

		const emitSpy = vi.spyOn(EventBus, 'emit');
		const waveSystem = new WaveSystem(unitSystem as never);
		waveSystem.start();

		expect(emitSpy).toHaveBeenCalledWith(
			'wave-started',
			expect.objectContaining({
				slotIndex: 1,
				phase: 'running',
				kind: 'normal',
				startAtSec: 0,
			}),
		);

		// Advance in 5s chunks (delta cap is 5000ms)
		const targetMs = BOSS_WARNING_AT_SECS[0] * 1000 + 1;
		const step = 5000;
		for (let t = 0; t < targetMs; t += step) {
			waveSystem.update(Math.min(step, targetMs - t));
		}
		expect(emitSpy).toHaveBeenCalledWith('boss-warning', {
			slotIndex: 8,
			bossSlotIndex: 9,
			startAtSec: BOSS_WARNING_AT_SECS[0],
		});
		// Advance another 30s to boss slot
		for (let t = 0; t < 30000; t += step) {
			waveSystem.update(Math.min(step, 30000 - t));
		}
		expect(emitSpy).toHaveBeenCalledWith(
			'wave-started',
			expect.objectContaining({
				slotIndex: 9,
				phase: 'boss',
				kind: 'boss',
				startAtSec: BOSS_SLOT_AT_SECS[0],
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
