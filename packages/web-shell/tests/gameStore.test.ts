import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/stores/gameStore';

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('starts in lobby screen', () => {
    expect(useGameStore.getState().screen).toBe('lobby');
  });

  it('navigates to game screen', () => {
    useGameStore.getState().setScreen('game');
    expect(useGameStore.getState().screen).toBe('game');
  });

  it('tracks unity loaded state', () => {
    expect(useGameStore.getState().unityLoaded).toBe(false);
    useGameStore.getState().setUnityLoaded(true);
    expect(useGameStore.getState().unityLoaded).toBe(true);
  });
});
