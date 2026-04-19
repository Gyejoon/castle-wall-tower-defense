import { INITIAL_PREP_MS, type WaveDef } from '@gld/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mini routing EventBus mock — same pattern as PhaseAOrchestrator tests.
const { EventBus, getEmits, resetBus } = vi.hoisted(() => {
	const handlers = new Map<string, Set<(payload?: unknown) => void>>();
	const emit = vi.fn((event: string, payload?: unknown) => {
		const set = handlers.get(event);
		if (set) for (const fn of set) fn(payload);
	});
	return {
		EventBus: {
			emit,
			on: (event: string, fn: (payload?: unknown) => void) => {
				if (!handlers.has(event)) handlers.set(event, new Set());
				handlers.get(event)?.add(fn);
			},
			off: (event: string, fn: (payload?: unknown) => void) => {
				handlers.get(event)?.delete(fn);
			},
		},
		getEmits: () => emit.mock.calls,
		resetBus: () => {
			handlers.clear();
			emit.mockClear();
		},
	};
});

vi.mock('../src/EventBus', () => ({ EventBus }));

import { WaveSystem } from '../src/systems/WaveSystem';

function makeFakeUnitSystem() {
	return {
		queueUnits: vi.fn(),
	};
}

function bossWave(slotIndex: number): WaveDef {
	return {
		slotIndex,
		kind: 'boss',
		groups: [{ unitId: 'slime' as never, count: 1 }],
		delayAfterClearSec: 1,
	};
}

function normalWave(slotIndex: number): WaveDef {
	return {
		slotIndex,
		kind: 'normal',
		groups: [{ unitId: 'slime' as never, count: 2 }],
		delayAfterClearSec: 1,
	};
}

beforeEach(() => {
	resetBus();
});

describe('WaveSystem — boss-wave clear trigger', () => {
	function runPrep(ws: WaveSystem, activeUnitCount = 0): void {
		// Burn through the prep timer in one big tick.
		ws.update(INITIAL_PREP_MS + 1, activeUnitCount);
	}

	it('boss wave killed naturally → wave-completed {cleared:true, phase:"boss"}', () => {
		const units = makeFakeUnitSystem();
		// At least 2 waves so isLastWave is false and the clear branch runs.
		const ws = new WaveSystem(units as never, [bossWave(1), normalWave(2)], 2);
		ws.start();
		runPrep(ws, 0); // advances to wave 1 (boss)
		expect(ws.getPhase()).toBe('boss');

		// Simulate: boss alive for a bit, then killed.
		ws.update(100, 1); // boss alive
		ws.update(50, 0); // boss dead

		const completed = getEmits().find(([e]) => e === 'wave-completed');
		expect(completed).toBeDefined();
		expect(completed?.[1]).toMatchObject({
			cleared: true,
			phase: 'boss',
			slotIndex: 1,
		});
	});

	// Run a sequence of sub-MAX_DELTA_MS updates with units alive so
	// elapsedMs climbs toward MAX_WAVE_DURATION_MS without ever tripping
	// the natural-clear branch. Stops one step short of expiry so the
	// caller controls the final tick.
	function fillWaveClockJustBelowTimerExpiry(ws: WaveSystem): void {
		const stepMs = 4000;
		// Seven steps = 28000ms (< 30000). Leaves ~2000ms of headroom so
		// the caller's final tick (3000ms) crosses the threshold.
		for (let i = 0; i < 7; i++) {
			ws.update(stepMs, 1);
		}
	}

	it('boss wave killed on the SAME tick timer expires → still cleared:true', () => {
		const units = makeFakeUnitSystem();
		const ws = new WaveSystem(units as never, [bossWave(1), normalWave(2)], 2);
		ws.start();
		runPrep(ws, 0);
		expect(ws.getPhase()).toBe('boss');

		fillWaveClockJustBelowTimerExpiry(ws);
		// Final tick: 3000ms pushes elapsed past MAX_WAVE_DURATION_MS (30000)
		// and simultaneously reports activeUnitCount=0 (last-second kill).
		ws.update(3000, 0);

		const completed = getEmits().find(([e]) => e === 'wave-completed');
		expect(completed).toBeDefined();
		// Regression guard: previously `cleared = !timerExpired = false`,
		// blocking the Phase 4 roguelike trigger. Now the natural-clear
		// signal wins whenever activeUnitCount === 0.
		expect(completed?.[1]).toMatchObject({
			cleared: true,
			phase: 'boss',
			slotIndex: 1,
		});
	});

	it('boss wave timer expires with units alive → cleared:false, phase:"boss"', () => {
		const units = makeFakeUnitSystem();
		const ws = new WaveSystem(units as never, [bossWave(1), normalWave(2)], 2);
		ws.start();
		runPrep(ws, 0);
		expect(ws.getPhase()).toBe('boss');

		fillWaveClockJustBelowTimerExpiry(ws);
		// Final tick: timer expires with 1 unit still alive → not a true clear.
		ws.update(3000, 1);

		const completed = getEmits().find(([e]) => e === 'wave-completed');
		expect(completed).toBeDefined();
		expect(completed?.[1]).toMatchObject({
			cleared: false,
			phase: 'boss',
		});
	});
});
