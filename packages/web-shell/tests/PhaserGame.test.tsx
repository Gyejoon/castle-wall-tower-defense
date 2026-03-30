import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const destroy = vi.hoisted(() => vi.fn());
const startGame = vi.hoisted(() => vi.fn(() => ({ destroy })));
const on = vi.hoisted(() => vi.fn());
const off = vi.hoisted(() => vi.fn());
const removeAllListeners = vi.hoisted(() => vi.fn());
const setGameReady = vi.hoisted(() => vi.fn());

vi.mock('@gld/phaser-game', () => ({
  startGame,
  EventBus: {
    on,
    off,
    removeAllListeners,
  },
}));

vi.mock('../src/stores/gameStore', () => ({
  useGameStore: (selector: (state: { setGameReady: typeof setGameReady }) => unknown) =>
    selector({ setGameReady }),
}));

import { PhaserGame } from '../src/game/PhaserGame';

describe('PhaserGame', () => {
  beforeEach(() => {
    destroy.mockClear();
    startGame.mockClear();
    on.mockClear();
    off.mockClear();
    removeAllListeners.mockClear();
    setGameReady.mockClear();
  });

  it('cleans up only its own game-ready listener on unmount', () => {
    const view = render(<PhaserGame />);

    view.unmount();

    expect(off).toHaveBeenCalledWith('game-ready', expect.any(Function));
    expect(removeAllListeners).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledWith(true);
    expect(setGameReady).toHaveBeenCalledWith(false);
  });
});
