import { create } from 'zustand';

type Screen = 'lobby' | 'game';

interface GameStoreState {
  screen: Screen;
  unityLoaded: boolean;
  setScreen: (screen: Screen) => void;
  setUnityLoaded: (loaded: boolean) => void;
}

export const useGameStore = create<GameStoreState>()((set) => ({
  screen: 'lobby',
  unityLoaded: false,
  setScreen: (screen) => set({ screen }),
  setUnityLoaded: (loaded) => set({ unityLoaded: loaded }),
}));
