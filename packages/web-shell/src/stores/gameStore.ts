import { create } from 'zustand';
import { INITIAL_GOLD, INITIAL_PLAYER_HP } from '@gld/shared';
import type { WavePhase } from '@gld/shared';

type Screen = 'lobby' | 'game';

interface GameStoreState {
  screen: Screen;
  gameReady: boolean;
  gold: number;
  lives: number;
  selectedTowerId: string | null;
  wave: number;
  wavePhase: WavePhase;
  countdown: number;

  setScreen: (screen: Screen) => void;
  setGameReady: (ready: boolean) => void;
  setGold: (gold: number) => void;
  setLives: (lives: number) => void;
  setSelectedTower: (towerId: string | null) => void;
  setWave: (wave: number) => void;
  setWavePhase: (phase: WavePhase) => void;
  setCountdown: (seconds: number) => void;
}

export const useGameStore = create<GameStoreState>()((set) => ({
  screen: 'lobby',
  gameReady: false,
  gold: INITIAL_GOLD,
  lives: INITIAL_PLAYER_HP,
  selectedTowerId: null,
  wave: 0,
  wavePhase: 'building',
  countdown: 0,

  setScreen: (screen) => set({ screen }),
  setGameReady: (ready) => set({ gameReady: ready }),
  setGold: (gold) => set({ gold }),
  setLives: (lives) => set({ lives }),
  setSelectedTower: (towerId) => set({ selectedTowerId: towerId }),
  setWave: (wave) => set({ wave }),
  setWavePhase: (phase) => set({ wavePhase: phase }),
  setCountdown: (seconds) => set({ countdown: seconds }),
}));
