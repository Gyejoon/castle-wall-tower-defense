import { EventBus } from '@gld/phaser-game';
import {
	DEFAULT_MAP_ID,
	isMapUnlocked,
	MAP_REGISTRY,
	type PlacementFailureReason,
} from '@gld/shared';
import { create } from 'zustand';
import { useMetaStore } from './metaStore';

const DEFAULT_DECK_IDS = ['laser', 'plasma', 'emp', 'shield'];

export type RunStatus =
	| 'lobby'
	| 'stageSelect'
	| 'stageDetail'
	| 'building'
	| 'running'
	| 'victory'
	| 'defeat';
export type LobbyTab = 'home' | 'collection' | 'missions' | 'settings';
export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface UiToast {
	id: number;
	message: string;
	tone: ToastTone;
}

/** Phaser emits wavesCleared~goldEarned; xpEarned is computed in the React layer via battleXp(). */
export interface GameOverStats {
	wavesCleared: number;
	towersPlaced: number;
	timeSurvivedSec: number;
	goldEarned: number;
	xpEarned: number;
}

interface GameStoreState {
	runId: number;
	runStatus: RunStatus;
	gameReady: boolean;
	selectedMapId: string;
	placementFeedback: PlacementFailureReason | null;
	lobbyTab: LobbyTab;
	bgmVolume: number;
	sfxVolume: number;
	colorblindMode: 'off' | 'protan' | 'deutan' | 'tritan';
	screenShake: boolean;
	showDamageNumbers: boolean;
	toast: UiToast | null;
	selectedDeck: string[];
	bossWarningVisible: boolean;
	gameOverStats: GameOverStats | null;
	tutorialStep: number | null;
	tutorialMessage: string | null;
	gameSpeed: 1 | 2;

	setRunStatus: (status: RunStatus) => void;
	setGameReady: (ready: boolean) => void;
	setSelectedMapId: (mapId: string) => void;
	setPlacementFeedback: (reason: PlacementFailureReason | null) => void;
	setLobbyTab: (tab: LobbyTab) => void;
	pushToast: (message: string, tone?: ToastTone) => void;
	clearToast: () => void;
	resetRun: () => void;
	enterLobby: () => void;
	setBgmVolume: (v: number) => void;
	setSfxVolume: (v: number) => void;
	setColorblindMode: (mode: 'off' | 'protan' | 'deutan' | 'tritan') => void;
	toggleScreenShake: () => void;
	toggleDamageNumbers: () => void;
	setSelectedDeck: (deck: string[]) => void;
	setBossWarningVisible: (v: boolean) => void;
	setGameOverStats: (stats: GameOverStats | null) => void;
	setTutorialStep: (step: number | null) => void;
	setTutorialMessage: (msg: string | null) => void;
	setGameSpeed: (speed: 1 | 2) => void;
	enterStageSelect: () => void;
	enterStageDetail: (mapId: string) => void;
}

const createRunState = () => ({
	gameReady: false,
	placementFeedback: null,
	toast: null,
	bossWarningVisible: false,
	gameOverStats: null,
	tutorialStep: null,
	tutorialMessage: null,
	gameSpeed: 1 as 1 | 2,
});

export const useGameStore = create<GameStoreState>()((set) => ({
	runId: 0,
	runStatus: 'lobby',
	selectedMapId: 'forest_gate',
	lobbyTab: 'home',
	bgmVolume: useMetaStore.getState().settings?.bgmVolume ?? 0.7,
	sfxVolume: useMetaStore.getState().settings?.sfxVolume ?? 0.8,
	colorblindMode: useMetaStore.getState().settings?.colorblindMode ?? 'off',
	screenShake: true,
	showDamageNumbers: true,
	selectedDeck: useMetaStore.getState().selectedDeck ?? DEFAULT_DECK_IDS,
	...createRunState(),

	setRunStatus: (status) => set({ runStatus: status }),
	setGameReady: (ready) => set({ gameReady: ready }),
	setSelectedMapId: (mapId) => set({ selectedMapId: mapId }),
	setPlacementFeedback: (reason) => set({ placementFeedback: reason }),
	setLobbyTab: (tab) => set({ lobbyTab: tab }),
	pushToast: (message, tone = 'info') =>
		set((state) => ({
			toast: {
				id: state.runId + Date.now(),
				message,
				tone,
			},
		})),
	clearToast: () => set({ toast: null }),
	resetRun: () => {
		set((state) => {
			// Guard: if selected map is locked, fall back to default
			// Use Infinity when store is unhydrated so we never accidentally lock maps
			const rawLevel = useMetaStore.getState().profile?.level;
			const level = rawLevel !== undefined ? rawLevel : Infinity;
			const map = MAP_REGISTRY[state.selectedMapId];
			const safeMapId =
				!map || !isMapUnlocked(map, level)
					? DEFAULT_MAP_ID
					: state.selectedMapId;
			return {
				runId: state.runId + 1,
				runStatus: 'building',
				lobbyTab: 'home',
				selectedMapId: safeMapId,
				...createRunState(),
			};
		});
		EventBus.emit('request-set-speed', { multiplier: 1 });
	},
	enterLobby: () => {
		set((state) => ({
			runId: state.runId + 1,
			runStatus: 'lobby',
			lobbyTab: 'home',
			...createRunState(),
		}));
		EventBus.emit('request-set-speed', { multiplier: 1 });
	},
	setBgmVolume: (v) => {
		useMetaStore.getState().updateSettings({ bgmVolume: v });
		set({ bgmVolume: v });
	},
	setSfxVolume: (v) => {
		useMetaStore.getState().updateSettings({ sfxVolume: v });
		set({ sfxVolume: v });
	},
	setColorblindMode: (mode) => {
		useMetaStore.getState().updateSettings({ colorblindMode: mode });
		set({ colorblindMode: mode });
	},
	toggleScreenShake: () =>
		set((state) => ({ screenShake: !state.screenShake })),
	toggleDamageNumbers: () =>
		set((state) => ({ showDamageNumbers: !state.showDamageNumbers })),
	setSelectedDeck: (deck) => {
		useMetaStore.getState().setSelectedDeck(deck);
		set({ selectedDeck: deck });
	},
	setBossWarningVisible: (v) => set({ bossWarningVisible: v }),
	setGameOverStats: (stats) => set({ gameOverStats: stats }),
	setTutorialStep: (step) => set({ tutorialStep: step }),
	setTutorialMessage: (msg) => set({ tutorialMessage: msg }),
	setGameSpeed: (speed) => {
		set({ gameSpeed: speed });
		EventBus.emit('request-set-speed', { multiplier: speed });
	},
	enterStageSelect: () => set({ runStatus: 'stageSelect', lobbyTab: 'home' }),
	enterStageDetail: (mapId: string) =>
		set({ runStatus: 'stageDetail', selectedMapId: mapId }),
}));
