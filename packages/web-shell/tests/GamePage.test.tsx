import { createDefaultSave } from '@gld/shared';
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
import { useMetaStore } from '../src/stores/metaStore';

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
		soundGenerator: {
			setMasterVolume: vi.fn(),
			unlock: vi.fn().mockResolvedValue(undefined),
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
		useMetaStore.setState(createDefaultSave());
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
				towerId: 'archer',
				success: false,
				reason: 'combat_phase',
			});
		});

		expect(useGameStore.getState().placementFeedback).toBe('combat_phase');
	});

	it('shows the HUD with HP, energy, and timer', () => {
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
		// Phase 8 [8.2]: energy 60 shows in both TopHud and the GameHud
		// info badge, so getAllByText disambiguates the match.
		expect(view.getAllByText('60').length).toBeGreaterThan(0);
		expect(view.getByTestId('hud-timer').textContent).toContain('보스');
		// Phase 6: scenario deck dock removed. HUD is always mounted.
		expect(view.queryByTestId('deck-dock')).toBeNull();
		expect(view.queryByTestId('hud-pressure')).toBeNull();
		expect(view.queryByTestId('hud-next-pressure')).toBeNull();
		expect(view.queryByText('AI')).toBeNull();
	});

	it('gstack UI/UX: mobile HUD container stays on one line without wrap', () => {
		const view = render(<GamePage />);
		const hudRow = view.getByTestId('top-hud-row') as HTMLDivElement;

		expect(hudRow.className).toContain('flex-nowrap');
		expect(hudRow.className).toContain('whitespace-nowrap');
		expect(hudRow.className).toContain('overflow-hidden');
	});

	it('shows victory state when local player wins', () => {
		const { emitSpy } = getEventBusHarness();
		const view = render(<GamePage />);

		act(() => {
			emitSpy('game-over', {
				result: 'victory',
				selectedStar: 1,
				starCleared: true,
				hpRemaining: 20,
				stats: {
					wavesCleared: 10,
					towersPlaced: 5,
					timeSurvivedSec: 180,
					goldEarned: 200,
					rewardMultiplier: 1,
				},
			});
		});

		expect(useGameStore.getState().runStatus).toBe('victory');
		expect(view.getByRole('button', { name: /다시 시작/i })).toBeTruthy();
	});

	it('결과 화면에 획득 XP를 표시한다', () => {
		const { emitSpy } = getEventBusHarness();
		const view = render(<GamePage />);

		act(() => {
			emitSpy('game-over', {
				result: 'victory',
				selectedStar: 1,
				starCleared: true,
				hpRemaining: 20,
				stats: {
					wavesCleared: 10,
					towersPlaced: 5,
					timeSurvivedSec: 180,
					goldEarned: 200,
					rewardMultiplier: 1,
				},
			});
		});

		expect(view.getByText(/획득 XP/)).toBeTruthy();
	});

	it('handles game-over only through the result payload contract', () => {
		const { emitSpy } = getEventBusHarness();
		render(<GamePage />);

		act(() => {
			emitSpy('game-over', {
				result: 'defeat',
				selectedStar: 1,
				starCleared: false,
				hpRemaining: 0,
				stats: {
					wavesCleared: 5,
					towersPlaced: 3,
					timeSurvivedSec: 90,
					goldEarned: 80,
					rewardMultiplier: 1,
				},
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

	it('records victory progress — highestWave and battle counters', () => {
		const { emitSpy } = getEventBusHarness();
		render(<GamePage />);

		act(() => {
			emitSpy('game-over', {
				result: 'victory',
				stats: {
					wavesCleared: 10,
					totalWaves: 50,
					towersPlaced: 5,
					timeSurvivedSec: 180,
					goldEarned: 200,
				},
			});
		});

		const state = useMetaStore.getState();
		expect(state.progress.highestWave).toBe(10);
		expect(state.profile.wins).toBe(1);
		expect(state.profile.totalGoldEarned).toBeGreaterThanOrEqual(200);
	});

	it('Phase 6: 2x speed is always unlocked', () => {
		useGameStore.setState({ runStatus: 'running' });
		const view = render(<GamePage />);

		expect(view.getByRole('button', { name: /배속 1x/i })).toBeTruthy();
	});

	it('portrait shell uses 100dvh + max-w-[540px] (mobile portrait standard)', () => {
		const view = render(<GamePage />);
		const shell = view.getByTestId('game-portrait-shell') as HTMLDivElement;
		// Height follows viewport (100dvh) so URL bar collapse doesn't cut HUDs.
		expect(shell.style.height).toBe('100dvh');
		// No CSS transform — HUDs render at natural DOM size on every device,
		// which is required for safe-area-inset-top to reach the status bar
		// correctly on devices like Galaxy S25.
		expect(shell.style.transform).toBe('');
		expect(shell.className).toContain('max-w-[540px]');
		expect(shell.className).toContain('flex-col');
	});

	it('resets prep countdown UI when combat starts', () => {
		const { emitSpy } = getEventBusHarness();
		const view = render(<GamePage />);

		act(() => {
			emitSpy('wave-prep-started', { durationMs: 5000 });
		});
		expect(view.getByText('준비 5')).toBeTruthy();

		act(() => {
			emitSpy('wave-prep-tick', { remainingMs: 2000 });
		});
		expect(view.getByText('준비 2')).toBeTruthy();

		act(() => {
			emitSpy('wave-started', {
				wave: 1,
				totalWaves: 10,
				slotIndex: 1,
				phase: 'combat',
				kind: 'normal',
				startAtSec: 0,
			});
		});

		expect(view.queryByText(/준비\s+\d/)).toBeNull();
		expect(useGameStore.getState().wavePhase).toBe('combat');
		expect(useGameStore.getState().countdown).toBe(0);
	});
});
