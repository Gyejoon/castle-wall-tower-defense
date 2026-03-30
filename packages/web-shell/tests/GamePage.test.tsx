import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import { useEmoteStore } from '../src/stores/emoteStore';
import { useGameStore } from '../src/stores/gameStore';

type EventHandler = (payload?: unknown) => void;

type EventBusHarness = {
  listeners: Map<string, Set<EventHandler>>;
  emitSpy: ReturnType<typeof vi.fn>;
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
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16);
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
    handlers.forEach((handler) => handler(payload));
  });

  globalThis.__eventBusHarness__ = { listeners, emitSpy };

  return {
    EventBus: {
      emit: emitSpy,
      on: (event: string, handler: EventHandler) => {
        const handlers = listeners.get(event) ?? new Set<EventHandler>();
        handlers.add(handler);
        listeners.set(event, handlers);
      },
      off: (event: string, handler: EventHandler) => {
        listeners.get(event)?.delete(handler);
      },
    },
  };
});

let GamePage: typeof import('../src/pages/GamePage').GamePage;

describe('GamePage', () => {
  beforeAll(async () => {
    ({ GamePage } = await import('../src/pages/GamePage'));
  });

  beforeEach(() => {
    const { emitSpy, listeners } = getEventBusHarness();
    emitSpy.mockClear();
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

  it('emits buy-random-tower event when buy button clicked', () => {
    const { emitSpy } = getEventBusHarness();
    const view = render(<GamePage />);

    const buyButton = view.getByRole('button', { name: /타워 구매/i });
    fireEvent.click(buyButton);
    expect(emitSpy).toHaveBeenCalledWith('request-buy-random-tower');
  });

  it('stores placement feedback from failed placement events', () => {
    const { emitSpy } = getEventBusHarness();
    const view = render(<GamePage />);

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
    expect(view.getByText(/건설 페이즈 전용/i)).toBeTruthy();
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

  it('emits send-emote after local emote selection (AI response handled by AIOpponent)', () => {
    const { emitSpy } = getEventBusHarness();
    const view = render(<GamePage />);

    fireEvent.click(view.getByRole('button', { name: /open emotes/i }));
    fireEvent.click(view.getByTestId('emote-gg'));

    expect(emitSpy).toHaveBeenCalledWith('send-emote', { emoteId: 'gg' });
    expect(view.getAllByText(/GG/i).length).toBeGreaterThan(0);
  });

  it('starts fading the emote bubble after 4 seconds and removes it after the fade', () => {
    vi.useFakeTimers();
    const view = render(<GamePage />);

    fireEvent.click(view.getByRole('button', { name: /open emotes/i }));
    fireEvent.click(view.getByTestId('emote-gg'));

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

    expect(view.queryByText(/GG/i)).toBeNull();
  });
});
