import { act, fireEvent, render } from '@testing-library/react';
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
import { useEmoteStore } from '../src/stores/emoteStore';
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
		useEmoteStore.setState({
			myEmote: null,
			opponentEmote: null,
			showEmotePanel: false,
		});
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

	it('gstack UI/UX: HUD clearly shows HP, gold, timer, pressure tokens, and next pressure effect in one row', () => {
		const { emitSpy } = getEventBusHarness();
		const view = render(<GamePage />);

		act(() => {
			emitSpy('gold-changed', { gold: 60 });
			emitSpy('wave-started', {
				slotIndex: 10,
				phase: 'boss',
				kind: 'boss',
				startAtSec: 270,
			});
			emitSpy('pressure-earned', {
				ownerId: 'local',
				slotIndex: 10,
				pressureTokens: 1,
				packetId: 'mixed_pressure',
			});
			emitSpy('pressure-queued', {
				ownerId: 'local',
				slotIndex: 10,
				pressureTokens: 0,
				packetId: 'mixed_pressure',
				targetSlotIndex: 11,
			});
		});

		expect(view.getByText('HP 20')).toBeTruthy();
		expect(view.getByText('G 60')).toBeTruthy();
		expect(view.getByTestId('hud-timer').textContent).toContain('보스');
		expect(view.getByTestId('hud-pressure').textContent).toContain('압박 0');
		expect(view.getByTestId('hud-next-pressure').textContent).toContain('혼합');
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
			emitSpy('game-over', { winnerId: 'local' });
		});

		expect(useGameStore.getState().runStatus).toBe('victory');
		expect(view.getByRole('button', { name: /다시 시작/i })).toBeTruthy();
	});

	it('turns merge failure and boss warning into toast state instead of top-bar text noise', () => {
		const { emitSpy } = getEventBusHarness();
		const view = render(<GamePage />);

		act(() => {
			emitSpy('boss-warning', {
				slotIndex: 8,
				bossSlotIndex: 9,
				startAtSec: 210,
			});
		});
		expect(view.getByText('보스 경고')).toBeTruthy();

		act(() => {
			emitSpy('tower-merge-resolved', {
				success: false,
				fromPos: { x: 0, y: 0 },
				toPos: { x: 0, y: 1 },
				failureReason: 'merge_failed',
			});
		});
		expect(view.getByText('합성 실패')).toBeTruthy();
	});

	it('stores opponent emotes only when the event includes opponent playerId', () => {
		const { emitSpy } = getEventBusHarness();
		render(<GamePage />);

		act(() => {
			emitSpy('emote-received', { emoteId: 'gg', playerId: 'local' });
		});

		expect(useEmoteStore.getState().opponentEmote).toBeNull();

		act(() => {
			emitSpy('emote-received', { emoteId: 'gg', playerId: 'opponent' });
		});

		expect(useEmoteStore.getState().opponentEmote?.id).toBe('gg');
	});

	it('emits send-emote after clicking inline emote button', () => {
		const { emitSpy } = getEventBusHarness();
		const view = render(<GamePage />);

		const ggButtons = view.getAllByText(/GG/i);
		fireEvent.click(ggButtons[0]);

		expect(emitSpy).toHaveBeenCalledWith('send-emote', { emoteId: 'gg' });
	});

	it('starts fading the emote bubble after 4 seconds and removes it after the fade', () => {
		vi.useFakeTimers();
		const view = render(<GamePage />);

		const ggButtons = view.getAllByText(/GG/i);
		fireEvent.click(ggButtons[0]);

		expect(view.getAllByText(/GG/i).length).toBeGreaterThan(0);

		act(() => {
			vi.advanceTimersByTime(4000);
		});

		expect(view.getAllByText(/GG/i).length).toBeGreaterThan(0);

		act(() => {
			vi.advanceTimersByTime(599);
		});

		expect(view.getAllByText(/GG/i).length).toBeGreaterThan(0);

		act(() => {
			vi.advanceTimersByTime(1);
		});

		const remaining = view.getAllByText(/GG/i);
		expect(remaining.length).toBe(1);
	});
});
