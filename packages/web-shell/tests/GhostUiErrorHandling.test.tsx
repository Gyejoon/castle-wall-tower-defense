import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import type { MatchResult } from '@gld/shared';
import { useGameStore } from '../src/stores/gameStore';

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

vi.mock('@gld/phaser-game/src/audio/SoundGenerator', () => ({
  soundGenerator: {
    playMatchVictory: vi.fn(),
    playMatchDefeat: vi.fn(),
  },
}));

let LobbyPage: typeof import('../src/pages/LobbyPage').LobbyPage;
let MatchSummary: typeof import('../src/components/MatchSummary').MatchSummary;

const sampleMatchResult: MatchResult = {
  playerWavesCompleted: 5,
  playerGoldRemaining: 80,
  ghostWavesCompleted: 5,
  ghostGoldRemaining: 60,
  outcome: 'victory',
  ghostName: 'Aggro Ghost',
};

describe('ghost fetch error handling', () => {
  beforeAll(async () => {
    ({ LobbyPage } = await import('../src/pages/LobbyPage'));
    ({ MatchSummary } = await import('../src/components/MatchSummary'));
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('keeps the player in the lobby when ghost loading returns a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: vi.fn().mockResolvedValue({}),
      }),
    );

    const view = render(<LobbyPage />);
    fireEvent.click(view.getByRole('button', { name: /ghost battle/i }));

    await waitFor(() => {
      expect(view.getByText(/unable to load ghost/i)).toBeTruthy();
    });

    expect(useGameStore.getState().runStatus).toBe('lobby');
    expect(useGameStore.getState().ghostBattleActive).toBe(false);
    expect(view.getByRole('button', { name: /ghost battle/i })).toBeTruthy();
  });

  it('keeps the summary open when play again cannot load a ghost', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({}),
      }),
    );

    useGameStore.setState({
      ...useGameStore.getInitialState(),
      runStatus: 'victory',
      ghostBattleActive: true,
      matchResult: sampleMatchResult,
    });

    const view = render(<MatchSummary />);
    fireEvent.click(view.getByRole('button', { name: /play again/i }));

    await waitFor(() => {
      expect(view.getByText(/unable to load ghost/i)).toBeTruthy();
    });

    expect(useGameStore.getState().runStatus).toBe('victory');
    expect(useGameStore.getState().matchResult).toEqual(sampleMatchResult);
    expect(view.getByRole('button', { name: /play again/i })).toBeTruthy();
  });
});
