import type { PlacementFailureReason, WavePhase } from '@gld/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoisted routing EventBus mock — mirrors tests/PhaseAOrchestrator.test.ts.
// emit() actually dispatches to registered handlers so observers can record
// what PlacementCoordinator emits.
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
		getEmits: () => emit.mock.calls as Array<[string, unknown]>,
		resetBus: () => {
			handlers.clear();
			emit.mockClear();
		},
	};
});

vi.mock('../../src/EventBus', () => ({ EventBus }));

import { PlacementCoordinator } from '../../src/scenes/input/PlacementCoordinator';

interface FakeOrchestrator {
	hasPendingSummon: ReturnType<typeof vi.fn>;
	completePlacement: ReturnType<typeof vi.fn>;
}

function makeOrchestrator(pending: boolean): FakeOrchestrator {
	return {
		hasPendingSummon: vi.fn(() => pending),
		completePlacement: vi.fn(),
	};
}

function makeEnergy(opts: { canAfford?: boolean } = {}) {
	return {
		canAfford: vi.fn(() => opts.canAfford ?? true),
		spend: vi.fn(() => true),
		add: vi.fn(),
		getEnergy: vi.fn(() => 100),
	};
}

function makeDeck(opts: { card?: { energyCost: number } | null } = {}) {
	const card = opts.card === undefined ? { energyCost: 30 } : opts.card;
	return {
		getCardByTowerId: vi.fn(() => card),
	};
}

function makeTowers(
	placeResult:
		| { success: true }
		| { success: false; reason: PlacementFailureReason } = {
		success: true,
	},
	towerCount = 1,
) {
	return {
		placeTower: vi.fn(() => placeResult),
		getTowers: vi.fn(() => Array.from({ length: towerCount })),
	};
}

function makeWaves(phase: WavePhase = 'prep') {
	return {
		getPhase: vi.fn(() => phase),
	};
}

function buildCoordinator(
	overrides: {
		towers?: ReturnType<typeof makeTowers>;
		energy?: ReturnType<typeof makeEnergy>;
		deck?: ReturnType<typeof makeDeck>;
		orchestrator?: FakeOrchestrator | undefined;
		waves?: ReturnType<typeof makeWaves>;
		onSuccess?: ReturnType<typeof vi.fn>;
		onBeforeSuccessEmit?: ReturnType<typeof vi.fn>;
		onPhaseAFastPath?: ReturnType<typeof vi.fn>;
	} = {},
) {
	const towers = overrides.towers ?? makeTowers();
	const energy = overrides.energy ?? makeEnergy();
	const deck = overrides.deck ?? makeDeck();
	const orchestrator = overrides.orchestrator;
	const waves = overrides.waves ?? makeWaves();
	const onSuccess = overrides.onSuccess ?? vi.fn();
	const onBeforeSuccessEmit = overrides.onBeforeSuccessEmit ?? vi.fn();
	const onPhaseAFastPath = overrides.onPhaseAFastPath ?? vi.fn();
	const coord = new PlacementCoordinator({
		towers: towers as never,
		energy: energy as never,
		deck: deck as never,
		orchestrator: orchestrator as never,
		waves: waves as never,
		emit: EventBus.emit.bind(EventBus),
		onBeforeSuccessEmit,
		onSuccess,
		onPhaseAFastPath,
	});
	return {
		coord,
		towers,
		energy,
		deck,
		orchestrator,
		waves,
		onSuccess,
		onBeforeSuccessEmit,
		onPhaseAFastPath,
	};
}

beforeEach(() => {
	resetBus();
});

describe('PlacementCoordinator', () => {
	describe('Phase A fast-path', () => {
		it('routes to orchestrator.completePlacement with no EventBus emit when hasPendingSummon is true', () => {
			const orchestrator = makeOrchestrator(true);
			const { coord, towers, energy } = buildCoordinator({ orchestrator });

			coord.place(3, 4, 'archer');

			expect(orchestrator.completePlacement).toHaveBeenCalledWith(3, 4);
			// Critical invariant: fast-path must NOT touch energy or emit a
			// `tower-placed` event (orchestrator owns that lifecycle).
			expect(energy.canAfford).not.toHaveBeenCalled();
			expect(energy.spend).not.toHaveBeenCalled();
			expect(towers.placeTower).not.toHaveBeenCalled();
			const events = getEmits().map(([name]) => name);
			expect(events).not.toContain('tower-placed');
			expect(events).not.toContain('player-tower-count');
		});

		it('invokes onPhaseAFastPath for post-placement cleanup hooks', () => {
			const orchestrator = makeOrchestrator(true);
			const { coord, onPhaseAFastPath } = buildCoordinator({ orchestrator });

			coord.place(1, 2, 'archer');

			expect(onPhaseAFastPath).toHaveBeenCalledTimes(1);
		});

		it('falls through to normal path when orchestrator.hasPendingSummon is false', () => {
			const orchestrator = makeOrchestrator(false);
			const { coord, towers } = buildCoordinator({ orchestrator });

			coord.place(2, 2, 'archer');

			expect(orchestrator.completePlacement).not.toHaveBeenCalled();
			expect(towers.placeTower).toHaveBeenCalledTimes(1);
		});
	});

	describe('normal path failures', () => {
		it('returns silently when the deck has no card for the towerDefId', () => {
			const deck = makeDeck({ card: null });
			const { coord, towers, energy } = buildCoordinator({ deck });

			coord.place(0, 0, 'missing');

			expect(towers.placeTower).not.toHaveBeenCalled();
			expect(energy.canAfford).not.toHaveBeenCalled();
			expect(getEmits()).toEqual([]);
		});

		it('emits tower-placed(success:false, insufficient_energy) when energy.canAfford returns false', () => {
			const energy = makeEnergy({ canAfford: false });
			const { coord, towers } = buildCoordinator({ energy });

			coord.place(5, 6, 'archer');

			expect(towers.placeTower).not.toHaveBeenCalled();
			const calls = getEmits();
			expect(calls).toEqual([
				[
					'tower-placed',
					{
						col: 5,
						row: 6,
						towerId: 'archer',
						success: false,
						reason: 'insufficient_energy',
					},
				],
			]);
		});

		it('emits tower-placed with the guardFailure reason when the placement guard fails', () => {
			// `ended` phase triggers `combat_phase` reason in placementRules.
			const waves = makeWaves('ended');
			const { coord, towers, energy } = buildCoordinator({ waves });

			coord.place(1, 1, 'archer');

			expect(towers.placeTower).not.toHaveBeenCalled();
			expect(energy.spend).not.toHaveBeenCalled();
			const calls = getEmits();
			expect(calls).toEqual([
				[
					'tower-placed',
					{
						col: 1,
						row: 1,
						towerId: 'archer',
						success: false,
						reason: 'combat_phase',
					},
				],
			]);
		});

		it('forwards placeTower failure reason into the tower-placed event', () => {
			const towers = makeTowers({ success: false, reason: 'occupied' });
			const { coord, energy } = buildCoordinator({ towers });

			coord.place(7, 7, 'archer');

			expect(energy.spend).not.toHaveBeenCalled();
			const calls = getEmits();
			expect(calls).toEqual([
				[
					'tower-placed',
					{
						col: 7,
						row: 7,
						towerId: 'archer',
						success: false,
						reason: 'occupied',
					},
				],
			]);
		});
	});

	describe('success path', () => {
		it('spends energy, clears selection via onBeforeSuccessEmit, emits events, and runs onSuccess', () => {
			const { coord, energy, onBeforeSuccessEmit, onSuccess, towers } =
				buildCoordinator();

			coord.place(4, 5, 'archer');

			expect(energy.spend).toHaveBeenCalledWith(30);
			expect(onBeforeSuccessEmit).toHaveBeenCalledTimes(1);
			expect(onSuccess).toHaveBeenCalledTimes(1);
			expect(towers.placeTower).toHaveBeenCalledWith(4, 5, 'archer');

			const calls = getEmits().map(([name, payload]) => ({ name, payload }));
			expect(calls).toEqual([
				{ name: 'tower-deselected', payload: undefined },
				{
					name: 'tower-placed',
					payload: {
						col: 4,
						row: 5,
						towerId: 'archer',
						success: true,
						energySpent: 30,
					},
				},
				{
					name: 'player-tower-count',
					payload: { count: 1 },
				},
			]);
		});

		it('preserves emit order: tower-deselected fires before tower-placed', () => {
			const { coord } = buildCoordinator();

			coord.place(0, 0, 'archer');

			const events = getEmits().map(([name]) => name);
			const deselectedIdx = events.indexOf('tower-deselected');
			const placedIdx = events.indexOf('tower-placed');
			expect(deselectedIdx).toBeGreaterThanOrEqual(0);
			expect(placedIdx).toBeGreaterThan(deselectedIdx);
		});
	});
});
