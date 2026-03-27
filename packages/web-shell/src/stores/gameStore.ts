import { create } from 'zustand';

type Screen = 'lobby' | 'game';

interface GameStoreState {
  screen: Screen;
  gameReady: boolean;
  gold: number;
  lives: number;
  wave: number;
  selectedTowerId: string | null;

  setScreen: (screen: Screen) => void;
  setGameReady: (ready: boolean) => void;
  setGold: (gold: number) => void;
  setLives: (lives: number) => void;
  setWave: (wave: number) => void;
  setSelectedTower: (towerId: string | null) => void;
}

export const useGameStore = create<GameStoreState>()((set) => ({
  screen: 'lobby',
  gameReady: false,
  gold: 200,
  lives: 20,
  wave: 0,
  selectedTowerId: null,

  setScreen: (screen) => set({ screen }),
  setGameReady: (ready) => set({ gameReady: ready }),
  setGold: (gold) => set({ gold }),
  setLives: (lives) => set({ lives }),
  setWave: (wave) => set({ wave }),
  setSelectedTower: (towerId) => set({ selectedTowerId: towerId }),
}));
