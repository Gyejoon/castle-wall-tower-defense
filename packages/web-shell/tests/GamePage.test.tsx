import { act, render } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import { useGameStore } from '../src/stores/gameStore';

type EventHandler = (payload?: unknown) => void;

type EventBusHarness = {
	listeners: Map<string, Set<EventHandler>>;
	emitSpy: ReturnType<typeof vi.fn>;
	startGameSpy: ReturnType<typeof vi.fn>;
	destroySpy: ReturnType<typeof vi.fn>;
	offSpy: ReturnType<typeof vi.fn>;
	removeAllListenersSpy: ReturnType<typeof vi.fn>;
};

declare global {
	// eslint-disable-next-line no-var
	var __eventBusHarness__: EventBusHarness | undefined;
}

function getEventBusHarness(): EventBusHarness {
	if (!globalThis.__eventBusHarness__) {
		throw new Error('event bus harness not initialized');
	}

	return globalThis.__eventBusHarness__;
}

if (typeof document === 'undefined') {
	const dom = new JSDOM('<!doctype html><html><body></body></html>');

	globalThis.window = dom.window as unknown as Window & typeof globalThis;
	globalThis.document = dom.window.document;
	globalThis.navigator = dom.window.navigator;
	globalThis.HTMLElement = dom.window.HTMLElement;
	globalThis.Node = dom.window.Node;
	globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
	globalThis.IS_REACT_ACT_ENVIRONMENT = true;

	if (!globalThis.requestAnimationFrame) {
		globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
			setTimeout(() => cb(Date.now()), 16);
		globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
	}
}

vi.mock('../src/game/PhaserGame', () => ({
	PhaserGame: () => <div data-testid="phaser-game" />,
}));

vi.mock('@gld/phaser-game', () => {
	const listeners = new Map<string, Set<EventHandler>>();
	const emitSpy = vi.fn((event: string, payload?: unknown) => {
		const handlers = listeners.get(event);
		if (!handlers) return;
		handlers.forEach((handler) => {
			handler(payload);
		});
	});
	const destroySpy = vi.fn();
	const startGameSpy = vi.fn(() => ({ destroy: destroySpy }));
	const offSpy = vi.fn((event: string, handler: EventHandler) => {
		listeners.get(event)?.delete(handler);
	});
	const removeAllListenersSpy = vi.fn(() => {
		listeners.clear();
	});

	globalThis.__eventBusHarness__ = {
		listeners,
		emitSpy,
		startGameSpy,
		destroySpy,
		offSpy,
		removeAllListenersSpy,
	};

	return {
		startGame: startGameSpy,
		EventBus: {
			emit: emitSpy,
			on: (event: string, handler: EventHandler) => {
				const handlers = listeners.get(event) ?? new Set<EventHandler>();
				handlers.add(handler);
				listeners.set(event, handlers);
			},
			off: offSpy,
			removeAllListeners: removeAllListenersSpy,
		},
	};
});

let GamePage: typeof import('../src/pages/GamePage').GamePage;

describe('GamePage', () => {
	beforeAll(async () => {
		({ GamePage } = await import('../src/pages/GamePage'));
	});

	beforeEach(() => {
		const {
			emitSpy,
			listeners,
			startGameSpy,
			destroySpy,
			offSpy,
			removeAllListenersSpy,
		} = getEventBusHarness();
		emitSpy.mockClear();
		startGameSpy.mockClear();
		destroySpy.mockClear();
		offSpy.mockClear();
		removeAllListenersSpy.mockClear();
		listeners.clear();
		useGameStore.setState(useGameStore.getInitialState());
		useGameStore.getState().resetRun();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('stores placement feedback from failed placement events', () => {
		const { emitSpy } = getEventBusHarness();
		render(<GamePage />);

		act(() => {
			emitSpy('tower-placed', {
				col: 3,
				row: 4,
				towerId: 'laser',
				success: false,
				reason: 'combat_phase',
			});
		});

		expect(useGameStore.getState().placementFeedback).toBe('combat_phase');
	});

	it('shows single-player HUD with HP, energy, timer and deck dock', () => {
		const { emitSpy } = getEventBusHarness();
		const view = render(<GamePage />);

		act(() => {
			emitSpy('energy-changed', { energy: 60 });
			emitSpy('wave-started', {
				wave: 10,
				totalWaves: 10,
				slotIndex: 10,
				phase: 'boss',
				kind: 'boss',
				startAtSec: 270,
			});
		});

		expect(view.getByText('HP 20')).toBeTruthy();
		expect(view.getByText('⚡60')).toBeTruthy();
		expect(view.getByTestId('hud-timer').textContent).toContain('보스');
		expect(view.getByTestId('deck-dock')).toBeTruthy();
		expect(view.queryByTestId('hud-pressure')).toBeNull();
		expect(view.queryByTestId('hud-next-pressure')).toBeNull();
		expect(view.queryByText('AI')).toBeNull();
	});

	it('gstack UI/UX: mobile HUD container stays on one line without wrap', () => {
		const view = render(<GamePage />);
		const hud = view.getByTestId('top-hud') as HTMLDivElement;

		expect(hud.style.flexWrap).toBe('nowrap');
		expect(hud.style.whiteSpace).toBe('nowrap');
		expect(hud.style.overflow).toBe('hidden');
	});

	it('shows victory state when local player wins', () => {
		const { emitSpy } = getEventBusHarness();
		const view = render(<GamePage />);

		act(() => {
			emitSpy('game-over', {
				result: 'victory',
				reason: 'all_waves_cleared',
				finalSlot: 20,
			});
		});

		expect(useGameStore.getState().runStatus).toBe('victory');
		expect(view.getByRole('button', { name: /다시 시작/i })).toBeTruthy();
	});

	it('handles game-over only through the result payload contract', () => {
		const { emitSpy } = getEventBusHarness();
		render(<GamePage />);

		act(() => {
			emitSpy('game-over', {
				result: 'defeat',
				reason: 'base_hp_depleted',
				finalSlot: 7,
			});
		});

		expect(useGameStore.getState().runStatus).toBe('defeat');
	});

	it('shows boss warning and insufficient energy as toasts', () => {
		const { emitSpy } = getEventBusHarness();
		const view = render(<GamePage />);

		act(() => {
			emitSpy('boss-warning', {
				slotIndex: 8,
				bossSlotIndex: 9,
				startAtSec: 210,
			});
		});
		expect(view.getByText('⚠ WARNING ⚠')).toBeTruthy();

		act(() => {
			emitSpy('tower-placed', {
				col: 3,
				row: 4,
				towerId: 'emp',
				success: false,
				reason: 'insufficient_energy',
			});
		});
		expect(view.getByText('에너지 부족')).toBeTruthy();
	});
});
