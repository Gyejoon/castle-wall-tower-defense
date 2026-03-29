import { create } from 'zustand';
import { INITIAL_GOLD, INITIAL_PLAYER_HP, type PlacementFailureReason, type WavePhase } from '@gld/shared';

export type RunStatus = 'lobby' | 'building' | 'combat' | 'victory' | 'defeat';

interface GameStoreState {
  runId: number;
  runStatus: RunStatus;
  gameReady: boolean;
  gold: number;
  lives: number;
  selectedTowerId: string | null;
  wave: number;
  wavePhase: WavePhase;
  countdown: number;
  placementFeedback: PlacementFailureReason | null;

  setRunStatus: (status: RunStatus) => void;
  setGameReady: (ready: boolean) => void;
  setGold: (gold: number) => void;
  setLives: (lives: number) => void;
  setSelectedTower: (towerId: string | null) => void;
  setWave: (wave: number) => void;
  setWavePhase: (phase: WavePhase) => void;
  setCountdown: (seconds: number) => void;
  setPlacementFeedback: (reason: PlacementFailureReason | null) => void;
  resetRun: () => void;
  enterLobby: () => void;
}

const createRunState = () => ({
  gameReady: false,
  gold: INITIAL_GOLD,
  lives: INITIAL_PLAYER_HP,
  selectedTowerId: null,
  wave: 0,
  wavePhase: 'building' as WavePhase,
  countdown: 0,
  placementFeedback: null,
});

export const useGameStore = create<GameStoreState>()((set) => ({
  runId: 0,
  runStatus: 'lobby',
  ...createRunState(),

  setRunStatus: (status) => set({ runStatus: status }),
  setGameReady: (ready) => set({ gameReady: ready }),
  setGold: (gold) => set({ gold }),
  setLives: (lives) => set({ lives }),
  setSelectedTower: (towerId) => set({ selectedTowerId: towerId }),
  setWave: (wave) => set({ wave }),
  setWavePhase: (phase) => set({ wavePhase: phase }),
  setCountdown: (seconds) => set({ countdown: seconds }),
  setPlacementFeedback: (reason) => set({ placementFeedback: reason }),

  resetRun: () =>
    set((state) => ({
      runId: state.runId + 1,
      runStatus: 'building',
      ...createRunState(),
    })),

  enterLobby: () =>
    set((state) => ({
      runId: state.runId + 1,
      runStatus: 'lobby',
      ...createRunState(),
    })),
}));
