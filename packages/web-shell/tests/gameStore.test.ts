import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/stores/gameStore';
import { INITIAL_GOLD, INITIAL_PLAYER_HP } from '@gld/shared';

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

  it('tracks game ready state', () => {
    expect(useGameStore.getState().gameReady).toBe(false);
    useGameStore.getState().setGameReady(true);
    expect(useGameStore.getState().gameReady).toBe(true);
  });

  it('tracks gold', () => {
    expect(useGameStore.getState().gold).toBe(INITIAL_GOLD);
    useGameStore.getState().setGold(150);
    expect(useGameStore.getState().gold).toBe(150);
  });

  it('tracks lives', () => {
    expect(useGameStore.getState().lives).toBe(INITIAL_PLAYER_HP);
    useGameStore.getState().setLives(15);
    expect(useGameStore.getState().lives).toBe(15);
  });

  it('tracks selected tower', () => {
    expect(useGameStore.getState().selectedTowerId).toBeNull();
    useGameStore.getState().setSelectedTower('laser');
    expect(useGameStore.getState().selectedTowerId).toBe('laser');
  });
});
