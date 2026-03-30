import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../src/stores/gameStore';
import { INITIAL_GOLD, INITIAL_PLAYER_HP } from '@gld/shared';

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState());
  });

  it('starts in lobby screen', () => {
    expect(useGameStore.getState().runStatus).toBe('lobby');
  });

  it('starts a run from building state', () => {
    useGameStore.getState().resetRun();
    expect(useGameStore.getState().runStatus).toBe('building');
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

  it('tracks placement feedback', () => {
    expect(useGameStore.getState().placementFeedback).toBeNull();
    useGameStore.getState().setPlacementFeedback('combat_phase');
    expect(useGameStore.getState().placementFeedback).toBe('combat_phase');
  });

  it('setOpponentState updates opponent fields', () => {
    useGameStore.getState().setOpponentState({ hp: 5, gold: 200, towerCount: 3 });
    const s = useGameStore.getState();
    expect(s.opponentHp).toBe(5);
    expect(s.opponentGold).toBe(200);
    expect(s.opponentTowerCount).toBe(3);
  });

  it('enterLobby resets to lobby status', () => {
    useGameStore.getState().resetRun();
    useGameStore.getState().setGold(999);
    useGameStore.getState().enterLobby();
    expect(useGameStore.getState().runStatus).toBe('lobby');
    expect(useGameStore.getState().gold).toBe(INITIAL_GOLD);
  });

  it('toggleSound flips soundEnabled', () => {
    expect(useGameStore.getState().soundEnabled).toBe(true);
    useGameStore.getState().toggleSound();
    expect(useGameStore.getState().soundEnabled).toBe(false);
    useGameStore.getState().toggleSound();
    expect(useGameStore.getState().soundEnabled).toBe(true);
  });

  it('setActiveTab switches tab', () => {
    expect(useGameStore.getState().activeTab).toBe('player');
    useGameStore.getState().setActiveTab('opponent');
    expect(useGameStore.getState().activeTab).toBe('opponent');
  });

  it('resets a run to default combat resources and clears transient state', () => {
    const initialRunId = useGameStore.getState().runId;

    useGameStore.getState().setGameReady(true);
    useGameStore.getState().setGold(10);
    useGameStore.getState().setLives(3);
    useGameStore.getState().setSelectedTower('laser');
    useGameStore.getState().setWave(4);
    useGameStore.getState().setWavePhase('combat');
    useGameStore.getState().setCountdown(2);
    useGameStore.getState().setRunStatus('defeat');
    useGameStore.getState().setPlacementFeedback('combat_phase');

    useGameStore.getState().resetRun();

    expect(useGameStore.getState().runId).toBe(initialRunId + 1);
    expect(useGameStore.getState().runStatus).toBe('building');
    expect(useGameStore.getState().gameReady).toBe(false);
    expect(useGameStore.getState().gold).toBe(INITIAL_GOLD);
    expect(useGameStore.getState().lives).toBe(INITIAL_PLAYER_HP);
    expect(useGameStore.getState().selectedTowerId).toBeNull();
    expect(useGameStore.getState().placementFeedback).toBeNull();
    expect(useGameStore.getState().wave).toBe(0);
    expect(useGameStore.getState().wavePhase).toBe('building');
    expect(useGameStore.getState().countdown).toBe(0);
  });
});
