import { act, render, screen } from '@testing-library/react';
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

type EventHandler = (payload?: unknown) => void;

type EventBusHarness = {
	listeners: Map<string, Set<EventHandler>>;
	emitSpy: ReturnType<typeof vi.fn>;
	offSpy: ReturnType<typeof vi.fn>;
};

declare global {
	// eslint-disable-next-line no-var
	var __gameOverScreenBusHarness__: EventBusHarness | undefined;
}

function getHarness(): EventBusHarness {
	if (!globalThis.__gameOverScreenBusHarness__) {
		throw new Error('GameOverScreen test bus harness not initialized');
	}
	return globalThis.__gameOverScreenBusHarness__;
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
}

vi.mock('@gld/phaser-game', () => {
	const listeners = new Map<string, Set<EventHandler>>();
	const emitSpy = vi.fn((event: string, payload?: unknown) => {
		listeners.get(event)?.forEach((h) => {
			h(payload);
		});
	});
	const offSpy = vi.fn((event: string, handler: EventHandler) => {
		listeners.get(event)?.delete(handler);
	});
	globalThis.__gameOverScreenBusHarness__ = { listeners, emitSpy, offSpy };
	return {
		EventBus: {
			emit: emitSpy,
			on: (event: string, handler: EventHandler) => {
				const set = listeners.get(event) ?? new Set<EventHandler>();
				set.add(handler);
				listeners.set(event, set);
			},
			off: offSpy,
			removeAllListeners: vi.fn(() => listeners.clear()),
		},
	};
});

// Inline MockAdService mock so we can deterministically control resolution
// (the real one has a 500ms setTimeout that would slow the suite down).
// Must preserve the rest of `@gld/shared` (UI_COLORS, etc.) that sibling
// modules depend on at import time.
let mockAdResult: 'rewarded' | 'skipped' | 'error' = 'rewarded';
let mockAdCallCount = 0;
vi.mock('@gld/shared', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@gld/shared')>();
	return {
		...actual,
		MockAdService: {
			watchAd: vi.fn(async () => {
				mockAdCallCount++;
				return mockAdResult;
			}),
		},
	};
});

let GameOverScreen: typeof import('../src/components/game/GameOverScreen').GameOverScreen;

const defeatStats = {
	wavesCleared: 3,
	totalWaves: 10,
	towersPlaced: 8,
	timeSurvivedSec: 125,
	goldEarned: 40,
	xpEarned: 12,
};

async function flushAd(): Promise<void> {
	// MockAdService resolves microtask-async; awaiting a macrotask flushes
	// both the ad promise and any downstream state updates.
	await act(async () => {
		await new Promise((r) => setTimeout(r, 0));
	});
}

describe('GameOverScreen (Phase 10 Task 10.2)', () => {
	beforeAll(async () => {
		({ GameOverScreen } = await import(
			'../src/components/game/GameOverScreen'
		));
	});

	beforeEach(() => {
		const { listeners, emitSpy, offSpy } = getHarness();
		listeners.clear();
		emitSpy.mockClear();
		offSpy.mockClear();
		mockAdResult = 'rewarded';
		mockAdCallCount = 0;
	});

	afterEach(() => {
		const { listeners, emitSpy, offSpy } = getHarness();
		listeners.clear();
		emitSpy.mockClear();
		offSpy.mockClear();
	});

	it('does not render the continue button on victory', () => {
		render(
			<GameOverScreen
				runStatus="victory"
				gameOverStats={defeatStats}
				onRestart={() => {}}
				onLobby={() => {}}
			/>,
		);
		expect(screen.queryByTestId('game-over-continue')).toBeNull();
	});

	it('renders the continue button on defeat', () => {
		render(
			<GameOverScreen
				runStatus="defeat"
				gameOverStats={defeatStats}
				onRestart={() => {}}
				onLobby={() => {}}
			/>,
		);
		expect(screen.getByTestId('game-over-continue')).toBeDefined();
	});

	it('clicking continue after rewarded ad emits request-continue-run with livesRestored:5', async () => {
		render(
			<GameOverScreen
				runStatus="defeat"
				gameOverStats={defeatStats}
				onRestart={() => {}}
				onLobby={() => {}}
			/>,
		);
		act(() => {
			(screen.getByTestId('game-over-continue') as HTMLButtonElement).click();
		});
		await flushAd();
		const { emitSpy } = getHarness();
		const calls = emitSpy.mock.calls.filter(
			([evt]) => evt === 'request-continue-run',
		);
		expect(calls.length).toBe(1);
		expect(calls[0][1]).toEqual({ livesRestored: 5 });
	});

	it('double-clicking continue still only triggers a single ad watch', async () => {
		render(
			<GameOverScreen
				runStatus="defeat"
				gameOverStats={defeatStats}
				onRestart={() => {}}
				onLobby={() => {}}
			/>,
		);
		act(() => {
			const btn = screen.getByTestId('game-over-continue') as HTMLButtonElement;
			btn.click();
			btn.click();
			btn.click();
		});
		await flushAd();
		expect(mockAdCallCount).toBe(1);
		const { emitSpy } = getHarness();
		const calls = emitSpy.mock.calls.filter(
			([evt]) => evt === 'request-continue-run',
		);
		expect(calls.length).toBe(1);
	});

	it('ad skipped → no emit, button becomes clickable again for retry', async () => {
		mockAdResult = 'skipped';
		render(
			<GameOverScreen
				runStatus="defeat"
				gameOverStats={defeatStats}
				onRestart={() => {}}
				onLobby={() => {}}
			/>,
		);
		act(() => {
			(screen.getByTestId('game-over-continue') as HTMLButtonElement).click();
		});
		await flushAd();
		const { emitSpy } = getHarness();
		const calls = emitSpy.mock.calls.filter(
			([evt]) => evt === 'request-continue-run',
		);
		expect(calls.length).toBe(0);
		// Retry → second call should go through to MockAdService.
		mockAdResult = 'rewarded';
		act(() => {
			(screen.getByTestId('game-over-continue') as HTMLButtonElement).click();
		});
		await flushAd();
		expect(mockAdCallCount).toBe(2);
		const retryCalls = emitSpy.mock.calls.filter(
			([evt]) => evt === 'request-continue-run',
		);
		expect(retryCalls.length).toBe(1);
	});
});
