import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { JSDOM } from 'jsdom';
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
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('selects and clears a tower through explicit events', () => {
    const { emitSpy } = getEventBusHarness();
    const view = render(<GamePage />);

    const laserButton = view.getByRole('button', { name: /레이저 터렛/i });
    fireEvent.click(laserButton);
    expect(emitSpy).toHaveBeenCalledWith('request-select-tower', { towerDefId: 'laser' });
    expect(useGameStore.getState().selectedTowerId).toBe('laser');

    fireEvent.click(laserButton);
    expect(emitSpy).toHaveBeenCalledWith('request-clear-tower-selection');
    expect(useGameStore.getState().selectedTowerId).toBeNull();
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

  it('keeps the latest ghost pressure warning visible until its own timer expires', () => {
    vi.useFakeTimers();
    const { emitSpy } = getEventBusHarness();
    render(<GamePage />);

    act(() => {
      emitSpy('ghost-pressure-applied', { wave: 1, pressure: 'attack' });
    });
    expect(useGameStore.getState().ghostPressureWarning).toBe(
      '고스트 공격! 정찰 드론 3기 출격!',
    );

    act(() => {
      vi.advanceTimersByTime(2000);
      emitSpy('ghost-pressure-applied', { wave: 2, pressure: 'defend' });
    });
    expect(useGameStore.getState().ghostPressureWarning).toBe('고스트가 방어를 강화합니다.');

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(useGameStore.getState().ghostPressureWarning).toBe('고스트가 방어를 강화합니다.');

    act(() => {
      vi.advanceTimersByTime(1900);
    });
    expect(useGameStore.getState().ghostPressureWarning).toBeNull();
  });
});
