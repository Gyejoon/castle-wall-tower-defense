import type { WaveDef } from '@gld/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundGenerator } from '../src/audio/SoundGenerator';

// Phase 7: STAGE_WAVES/TOTAL_WAVES removed with the scenario purge.
// Reconstruct a minimal 5-wave normal set + a 10-wave boss set in-test so
// WaveSystem still gets meaningful inputs without depending on deleted
// scenario constants.
const NORMAL_5: WaveDef[] = Array.from({ length: 5 }, (_, i) => ({
	slotIndex: i + 1,
	kind: 'normal' as const,
	delayAfterClearSec: 3,
	groups: [{ unitId: 'scout_drone', count: 3 }],
}));
const BOSS_10: WaveDef[] = [
	...Array.from({ length: 9 }, (_, i) => ({
		slotIndex: i + 1,
		kind: 'normal' as const,
		delayAfterClearSec: 5,
		groups: [{ unitId: 'scout_drone', count: 3 }],
	})),
	{
		slotIndex: 10,
		kind: 'boss' as const,
		delayAfterClearSec: 5,
		groups: [{ unitId: 'orc_warlord', count: 1 }],
	},
];
const TOTAL_WAVES = NORMAL_5.length;

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
			NORMAL_5,
			NORMAL_5.length + 5,
		);
		expect((waveSystem as { maxWaves: number }).maxWaves).toBe(TOTAL_WAVES);

		waveSystem.setMaxWaves(0);
		expect((waveSystem as { maxWaves: number }).maxWaves).toBe(1);

		waveSystem.setMaxWaves(NORMAL_5.length + 10);
		expect((waveSystem as { maxWaves: number }).maxWaves).toBe(TOTAL_WAVES);
	});

	it('event-based wave progression: prep → clear → wait → next wave', () => {
		const unitSystem = {
			queueUnits: vi.fn(),
			hasActiveUnits: vi.fn(() => false),
			hasQueuedUnits: vi.fn(() => false),
			getActiveCount: vi.fn(() => 0),
		};

		const emitSpy = vi.spyOn(EventBus, 'emit');
		const waveSystem = new WaveSystem(unitSystem as never, NORMAL_5);
		waveSystem.start();

		// Enters prep phase first
		expect(waveSystem.getPhase()).toBe('prep');

		// Tick past 5s prep — wave 1 starts
		waveSystem.update(5100, 0);
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

	it('emits boss-warning when boss wave starts', () => {
		const unitSystem = {
			queueUnits: vi.fn(),
			hasActiveUnits: vi.fn(() => false),
			hasQueuedUnits: vi.fn(() => false),
			getActiveCount: vi.fn(() => 0),
		};

		// Use w1_s8 which has boss at wave 10
		const emitSpy = vi.spyOn(EventBus, 'emit');
		const waveSystem = new WaveSystem(unitSystem as never, BOSS_10);
		waveSystem.start();

		// Consume prep phase (5s)
		waveSystem.update(5100, 0);

		// Advance through waves 1-9 (clear immediately since activeCount=0)
		for (let i = 0; i < 9; i++) {
			waveSystem.update(100, 0); // clear current wave
			waveSystem.update(5100, 0); // wait through delay
		}

		// Now on wave 10 (boss). boss-warning should have been emitted when it started.
		expect(emitSpy).toHaveBeenCalledWith(
			'boss-warning',
			expect.objectContaining({
				slotIndex: 9,
				bossSlotIndex: 10,
			}),
		);
	});

	it('enters prep phase on start and transitions to combat after INITIAL_PREP_MS', () => {
		const unitSystem = {
			queueUnits: vi.fn(),
			hasActiveUnits: vi.fn(() => false),
			hasQueuedUnits: vi.fn(() => false),
			getActiveCount: vi.fn(() => 0),
		};

		const emitSpy = vi.spyOn(EventBus, 'emit');
		const waveSystem = new WaveSystem(unitSystem as never, NORMAL_5);
		waveSystem.start();

		expect(waveSystem.getPhase()).toBe('prep');
		expect(emitSpy).toHaveBeenCalledWith('wave-prep-started', {
			durationMs: 5000,
		});
		// Units must NOT spawn during prep
		expect(unitSystem.queueUnits).not.toHaveBeenCalled();

		// Tick 3 seconds — still prep
		waveSystem.update(3000, 0);
		expect(waveSystem.getPhase()).toBe('prep');
		expect(emitSpy).toHaveBeenCalledWith('wave-prep-tick', {
			remainingMs: 2000,
		});

		// Tick past 5s total — transitions to combat and spawns wave 1
		waveSystem.update(2100, 0);
		expect(waveSystem.getPhase()).toBe('combat');
		expect(emitSpy).toHaveBeenCalledWith(
			'wave-started',
			expect.objectContaining({ slotIndex: 1, phase: 'combat' }),
		);
		expect(unitSystem.queueUnits).toHaveBeenCalled();
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
					setRotation: vi.fn(),
					setFlipX: vi.fn(),
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
		unitSystem.setPaths([
			[
				{ x: 0, y: 0 },
				{ x: 1, y: 0 },
			],
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
