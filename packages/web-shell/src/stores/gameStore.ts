import {
	type CombatHudState,
	INITIAL_ENERGY,
	INITIAL_PLAYER_HP,
	type PlacementFailureReason,
	type TowerDef,
	type WavePhase,
} from '@gld/shared';
import { create } from 'zustand';

export type RunStatus = 'lobby' | 'building' | 'running' | 'victory' | 'defeat';
export type LobbyTab = 'home' | 'collection' | 'settings';
export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface UiToast {
	id: number;
	message: string;
	tone: ToastTone;
}

type WavePreviewGroup = {
	unitId: string;
	unitName: string;
	count: number;
};

interface GameStoreState {
	runId: number;
	runStatus: RunStatus;
	gameReady: boolean;
	energy: number;
	lives: number;
	selectedTowerId: string | null;
	rolledTower: TowerDef | null;
	wave: number;
	wavePhase: WavePhase;
	countdown: number;
	placementFeedback: PlacementFailureReason | null;
	wavePreview: WavePreviewGroup[] | null;
	lobbyTab: LobbyTab;
	soundEnabled: boolean;
	screenShake: boolean;
	showDamageNumbers: boolean;
	playerTowerCount: number;
	combatHud: CombatHudState;
	toast: UiToast | null;

	setRunStatus: (status: RunStatus) => void;
	setGameReady: (ready: boolean) => void;
	setEnergy: (energy: number) => void;
	setLives: (lives: number) => void;
	setSelectedTower: (towerId: string | null) => void;
	setRolledTower: (tower: TowerDef | null) => void;
	setWave: (wave: number) => void;
	setWavePhase: (phase: WavePhase) => void;
	setCountdown: (seconds: number) => void;
	setPlacementFeedback: (reason: PlacementFailureReason | null) => void;
	setWavePreview: (preview: WavePreviewGroup[] | null) => void;
	setLobbyTab: (tab: LobbyTab) => void;
	setPlayerTowerCount: (count: number) => void;
	patchCombatHud: (patch: Partial<CombatHudState>) => void;
	pushToast: (message: string, tone?: ToastTone) => void;
	clearToast: () => void;
	resetRun: () => void;
	enterLobby: () => void;
	toggleSound: () => void;
	toggleScreenShake: () => void;
	toggleDamageNumbers: () => void;
}

const createCombatHud = (): CombatHudState => ({
	currentSlot: 1,
	phase: 'combat',
	buyCooldownMs: 0,
	bossWarning: false,
	timerLabel: 'Slot 1',
});

const createRunState = () => ({
	gameReady: false,
	energy: INITIAL_ENERGY,
	lives: INITIAL_PLAYER_HP,
	selectedTowerId: null,
	rolledTower: null,
	wave: 0,
	wavePhase: 'combat' as WavePhase,
	countdown: 0,
	placementFeedback: null,
	wavePreview: null,
	playerTowerCount: 0,
	combatHud: createCombatHud(),
	toast: null,
});

export const useGameStore = create<GameStoreState>()((set) => ({
	runId: 0,
	runStatus: 'lobby',
	lobbyTab: 'home',
	soundEnabled: true,
	screenShake: true,
	showDamageNumbers: true,
	...createRunState(),

	setRunStatus: (status) => set({ runStatus: status }),
	setGameReady: (ready) => set({ gameReady: ready }),
	setEnergy: (energy) => set({ energy }),
	setLives: (lives) => set({ lives }),
	setSelectedTower: (towerId) => set({ selectedTowerId: towerId }),
	setRolledTower: (tower) => set({ rolledTower: tower }),
	setWave: (wave) => set({ wave }),
	setWavePhase: (phase) => set({ wavePhase: phase }),
	setCountdown: (seconds) => set({ countdown: seconds }),
	setPlacementFeedback: (reason) => set({ placementFeedback: reason }),
	setWavePreview: (preview) => set({ wavePreview: preview }),
	setLobbyTab: (tab) => set({ lobbyTab: tab }),
	setPlayerTowerCount: (count) => set({ playerTowerCount: count }),
	patchCombatHud: (patch) =>
		set((state) => ({
			combatHud: {
				...state.combatHud,
				...patch,
			},
		})),
	pushToast: (message, tone = 'info') =>
		set((state) => ({
			toast: {
				id: state.runId + Date.now(),
				message,
				tone,
			},
		})),
	clearToast: () => set({ toast: null }),
	resetRun: () =>
		set((state) => ({
			runId: state.runId + 1,
			runStatus: 'building',
			lobbyTab: 'home',
			...createRunState(),
		})),
	enterLobby: () =>
		set((state) => ({
			runId: state.runId + 1,
			runStatus: 'lobby',
			lobbyTab: 'home',
			...createRunState(),
		})),
	toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
	toggleScreenShake: () =>
		set((state) => ({ screenShake: !state.screenShake })),
	toggleDamageNumbers: () =>
		set((state) => ({ showDamageNumbers: !state.showDamageNumbers })),
}));
