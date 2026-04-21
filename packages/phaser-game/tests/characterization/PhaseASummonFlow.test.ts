import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoisted routing EventBus — same pattern as tests/PhaseAOrchestrator.test.ts.
// emit() actually dispatches to registered handlers so we can exercise the
// full request → orchestrator → placeTower chain that Game.ts:1024-1032 is
// going to delegate to after Phase 5 extracts the scene input layer.
const { EventBus, resetBus } = vi.hoisted(() => {
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
		resetBus: () => {
			handlers.clear();
			emit.mockClear();
		},
	};
});

vi.mock('../../src/EventBus', () => ({ EventBus }));

import { PhaseAOrchestrator } from '../../src/systems/PhaseAOrchestrator';

interface FakeTower {
	col: number;
	row: number;
	towerId: string;
	family: string;
	tier: number;
	instanceId: string;
}

const TEST_FAMILY: Record<string, { family: string; tier: number }> = {
	archer: { family: 'archer', tier: 1 },
};

function makeFakeTowerSystem() {
	const towers: FakeTower[] = [];
	let nextId = 0;
	return {
		towers,
		playPhaseASummonVfx: vi.fn(),
		playPhaseAMergeVfx: vi.fn(),
		playMergeRevealVfx: vi.fn(),
		placeTower: vi.fn((col: number, row: number, defId: string) => {
			const meta = TEST_FAMILY[defId] ?? { family: 'archer', tier: 1 };
			const instanceId = `fake_${nextId++}`;
			towers.push({
				col,
				row,
				towerId: defId,
				family: meta.family,
				tier: meta.tier,
				instanceId,
			});
			return { success: true, tower: { instanceId } };
		}),
		getTowerLocator: vi.fn(() => null),
		getTowerAt: vi.fn(() => null),
		removeTowerAt: vi.fn(() => false),
	};
}

beforeEach(() => {
	resetBus();
});

// Characterization: Game.ts:1024-1032 routes placement clicks through the
// orchestrator when `hasPendingSummon()` is true. Phase 5 will move this
// branch into a scene-input module; the invariant below is what that module
// must preserve.
//
// The existing PhaseAOrchestrator.test.ts covers draw → complete → tower-
// summoned end-to-end. This file is intentionally narrow: it pins the
// **ordering** contract the scene relies on, so refactor drift in either
// direction (renaming completePlacement, adding an intermediate step,
// stashing state on a different field) is caught immediately.
describe('PhaseA summon → placement ordering (characterization)', () => {
	it('hasPendingSummon flips true on draw and false exactly at completePlacement', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
		});

		// Baseline: no draw yet.
		expect(orch.hasPendingSummon()).toBe(false);

		// Drawing flips the flag before any placeTower call — Game.ts:1025
		// branches on exactly this bit.
		EventBus.emit('request-summon-tower');
		expect(orch.hasPendingSummon()).toBe(true);
		expect(towerSystem.placeTower).not.toHaveBeenCalled();

		// completePlacement is the *only* method that consumes the pending
		// state into a placeTower call. If a future refactor introduces a
		// "confirmPlacement" intermediate step, this assertion trips.
		orch.completePlacement(3, 4);
		expect(orch.hasPendingSummon()).toBe(false);
		expect(towerSystem.placeTower).toHaveBeenCalledTimes(1);
		expect(towerSystem.placeTower).toHaveBeenCalledWith(3, 4, 'archer', {
			levelOverride: 1,
		});

		orch.destroy();
	});

	it('completePlacement without a pending summon is a no-op (does not call placeTower)', () => {
		// Game.ts guards the fast-path with `hasPendingSummon()` — but if a
		// refactor ever drops the guard, the orchestrator itself must stay
		// safe. Pin the current "silent no-op" behavior so the scene-input
		// extraction can rely on it.
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
		});

		expect(orch.hasPendingSummon()).toBe(false);
		orch.completePlacement(1, 1);
		expect(towerSystem.placeTower).not.toHaveBeenCalled();
		expect(orch.hasPendingSummon()).toBe(false);

		orch.destroy();
	});

	it('cancelPendingSummon — not completePlacement — is the only way to clear without placing', () => {
		// The scene's cancel-path goes through `cancelPendingSummon`. This
		// test pins the API surface: after a draw, calling completePlacement
		// *must* produce a placeTower call, and cancel *must not*.
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
		});

		EventBus.emit('request-summon-tower');
		expect(orch.hasPendingSummon()).toBe(true);

		orch.cancelPendingSummon();
		expect(orch.hasPendingSummon()).toBe(false);
		expect(towerSystem.placeTower).not.toHaveBeenCalled();

		orch.destroy();
	});
});
