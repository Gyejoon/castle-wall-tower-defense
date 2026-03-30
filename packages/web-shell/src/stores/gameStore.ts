import { create } from 'zustand';
import {
  INITIAL_GOLD,
  INITIAL_PLAYER_HP,
  type PlacementFailureReason,
  type TowerDef,
  type WavePhase,
} from '@gld/shared';

export type RunStatus = 'lobby' | 'building' | 'combat' | 'victory' | 'defeat';
export type FieldTab = 'player' | 'opponent';

interface GameStoreState {
  runId: number;
  runStatus: RunStatus;
  gameReady: boolean;
  gold: number;
  lives: number;
  selectedTowerId: string | null;
  rolledTower: TowerDef | null;
  wave: number;
  wavePhase: WavePhase;
  countdown: number;
  placementFeedback: PlacementFailureReason | null;
  wavePreview: Array<{ unitId: string; unitName: string; count: number }> | null;
  soundEnabled: boolean;
  activeTab: FieldTab;
  opponentHp: number;
  opponentGold: number;
  opponentTowerCount: number;

  setRunStatus: (status: RunStatus) => void;
  setGameReady: (ready: boolean) => void;
  setGold: (gold: number) => void;
  setLives: (lives: number) => void;
  setSelectedTower: (towerId: string | null) => void;
  setRolledTower: (tower: TowerDef | null) => void;
  setWave: (wave: number) => void;
  setWavePhase: (phase: WavePhase) => void;
  setCountdown: (seconds: number) => void;
  setPlacementFeedback: (reason: PlacementFailureReason | null) => void;
  setWavePreview: (preview: Array<{ unitId: string; unitName: string; count: number }> | null) => void;
  setActiveTab: (tab: FieldTab) => void;
  setOpponentState: (state: { hp: number; gold: number; towerCount: number }) => void;
  resetRun: () => void;
  enterLobby: () => void;
  toggleSound: () => void;
}

const createRunState = () => ({
  gameReady: false,
  gold: INITIAL_GOLD,
  lives: INITIAL_PLAYER_HP,
  selectedTowerId: null,
  rolledTower: null,
  wave: 0,
  wavePhase: 'building' as WavePhase,
  countdown: 0,
  placementFeedback: null,
  wavePreview: null,
  activeTab: 'player' as FieldTab,
  opponentHp: INITIAL_PLAYER_HP,
  opponentGold: INITIAL_GOLD,
  opponentTowerCount: 0,
});

export const useGameStore = create<GameStoreState>()((set) => ({
  runId: 0,
  runStatus: 'lobby',
  soundEnabled: true,
  ...createRunState(),

  setRunStatus: (status) => set({ runStatus: status }),
  setGameReady: (ready) => set({ gameReady: ready }),
  setGold: (gold) => set({ gold }),
  setLives: (lives) => set({ lives }),
  setSelectedTower: (towerId) => set({ selectedTowerId: towerId }),
  setRolledTower: (tower) => set({ rolledTower: tower }),
  setWave: (wave) => set({ wave }),
  setWavePhase: (phase) => set({ wavePhase: phase }),
  setCountdown: (seconds) => set({ countdown: seconds }),
  setPlacementFeedback: (reason) => set({ placementFeedback: reason }),
  setWavePreview: (preview) => set({ wavePreview: preview }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setOpponentState: (state) => set({
    opponentHp: state.hp,
    opponentGold: state.gold,
    opponentTowerCount: state.towerCount,
  }),

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

  toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
}));
