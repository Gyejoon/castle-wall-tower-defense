import { create } from 'zustand';
import {
  INITIAL_GOLD,
  INITIAL_PLAYER_HP,
  type PlacementFailureReason,
  type WavePhase,
  type GhostRecord,
  type MatchResult,
  type PressureChoice,
} from '@gld/shared';

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
  wavePreview: Array<{ unitId: string; unitName: string; count: number }> | null;

  // Ghost battle state
  ghostBattleActive: boolean;
  currentGhost: GhostRecord | null;
  matchResult: MatchResult | null;
  pressureChoice: PressureChoice;
  ghostPressureWarning: string | null;
  soundEnabled: boolean;

  setRunStatus: (status: RunStatus) => void;
  setGameReady: (ready: boolean) => void;
  setGold: (gold: number) => void;
  setLives: (lives: number) => void;
  setSelectedTower: (towerId: string | null) => void;
  setWave: (wave: number) => void;
  setWavePhase: (phase: WavePhase) => void;
  setCountdown: (seconds: number) => void;
  setPlacementFeedback: (reason: PlacementFailureReason | null) => void;
  setWavePreview: (preview: Array<{ unitId: string; unitName: string; count: number }> | null) => void;
  resetRun: () => void;
  enterLobby: () => void;

  // Ghost battle actions
  startGhostBattle: (ghost: GhostRecord) => void;
  setPressureChoice: (choice: PressureChoice) => void;
  setMatchResult: (result: MatchResult) => void;
  setGhostPressureWarning: (warning: string | null) => void;
  toggleSound: () => void;
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
  wavePreview: null,
});

const createGhostBattleState = () => ({
  ghostBattleActive: false,
  currentGhost: null as GhostRecord | null,
  matchResult: null as MatchResult | null,
  pressureChoice: 'defend' as PressureChoice,
  ghostPressureWarning: null as string | null,
});

export const useGameStore = create<GameStoreState>()((set) => ({
  runId: 0,
  runStatus: 'lobby',
  soundEnabled: true,
  ...createRunState(),
  ...createGhostBattleState(),

  setRunStatus: (status) => set({ runStatus: status }),
  setGameReady: (ready) => set({ gameReady: ready }),
  setGold: (gold) => set({ gold }),
  setLives: (lives) => set({ lives }),
  setSelectedTower: (towerId) => set({ selectedTowerId: towerId }),
  setWave: (wave) => set({ wave }),
  setWavePhase: (phase) => set({ wavePhase: phase }),
  setCountdown: (seconds) => set({ countdown: seconds }),
  setPlacementFeedback: (reason) => set({ placementFeedback: reason }),
  setWavePreview: (preview) => set({ wavePreview: preview }),

  resetRun: () =>
    set((state) => ({
      runId: state.runId + 1,
      runStatus: 'building',
      ...createRunState(),
      ...createGhostBattleState(),
      // Preserve ghost if restarting a ghost battle
      ghostBattleActive: state.ghostBattleActive,
      currentGhost: state.currentGhost,
    })),

  enterLobby: () =>
    set((state) => ({
      runId: state.runId + 1,
      runStatus: 'lobby',
      ...createRunState(),
      ...createGhostBattleState(),
    })),

  startGhostBattle: (ghost) =>
    set((state) => ({
      runId: state.runId + 1,
      runStatus: 'building',
      ...createRunState(),
      ...createGhostBattleState(),
      ghostBattleActive: true,
      currentGhost: ghost,
    })),

  setPressureChoice: (choice) => set({ pressureChoice: choice }),
  setMatchResult: (result) => set({ matchResult: result }),
  setGhostPressureWarning: (warning) => set({ ghostPressureWarning: warning }),
  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
}));
