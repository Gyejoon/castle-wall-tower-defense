import {
	type CombatHudState,
	DEFAULT_DECK,
	type DeckCardDef,
	INITIAL_ENERGY,
	INITIAL_PLAYER_HP,
	type PlacementFailureReason,
	type WavePhase,
} from '@gld/shared';
import { create } from 'zustand';
import { useMetaStore } from './metaStore';

const DEFAULT_DECK_IDS = ['laser', 'plasma', 'emp', 'shield'];

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

export interface BossHpState {
	hp: number;
	maxHp: number;
	phase: 1 | 2;
	visible: boolean;
}

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
	energy: number;
	lives: number;
	selectedMapId: string;
	selectedTowerId: string | null;
	deckCards: readonly DeckCardDef[];
	selectedCardIndex: number | null;
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
	selectedDeck: string[];
	bossHp: BossHpState;
	bossWarningVisible: boolean;
	gameOverStats: GameOverStats | null;

	setRunStatus: (status: RunStatus) => void;
	setGameReady: (ready: boolean) => void;
	setEnergy: (energy: number) => void;
	setLives: (lives: number) => void;
	setSelectedMapId: (mapId: string) => void;
	setSelectedTower: (towerId: string | null) => void;
	setDeckCards: (cards: readonly DeckCardDef[]) => void;
	setSelectedCardIndex: (index: number | null) => void;
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
	setSelectedDeck: (deck: string[]) => void;
	setBossHp: (bossHp: BossHpState) => void;
	setBossWarningVisible: (v: boolean) => void;
	setGameOverStats: (stats: GameOverStats | null) => void;
}

const createCombatHud = (): CombatHudState => ({
	currentSlot: 1,
	phase: 'combat',
	bossWarning: false,
	timerLabel: 'Slot 1',
});

const createRunState = () => ({
	gameReady: false,
	energy: INITIAL_ENERGY,
	lives: INITIAL_PLAYER_HP,
	selectedTowerId: null,
	deckCards: DEFAULT_DECK,
	selectedCardIndex: null,
	wave: 0,
	wavePhase: 'combat' as WavePhase,
	countdown: 0,
	placementFeedback: null,
	wavePreview: null,
	playerTowerCount: 0,
	combatHud: createCombatHud(),
	toast: null,
	bossHp: { hp: 0, maxHp: 0, phase: 1 as 1 | 2, visible: false },
	bossWarningVisible: false,
	gameOverStats: null,
});

export const useGameStore = create<GameStoreState>()((set) => ({
	runId: 0,
	runStatus: 'lobby',
	selectedMapId: 'forest_gate',
	lobbyTab: 'home',
	soundEnabled: true,
	screenShake: true,
	showDamageNumbers: true,
	selectedDeck: useMetaStore.getState().selectedDeck ?? DEFAULT_DECK_IDS,
	...createRunState(),

	setRunStatus: (status) => set({ runStatus: status }),
	setGameReady: (ready) => set({ gameReady: ready }),
	setEnergy: (energy) => set({ energy }),
	setLives: (lives) => set({ lives }),
	setSelectedMapId: (mapId) => set({ selectedMapId: mapId }),
	setSelectedTower: (towerId) => set({ selectedTowerId: towerId }),
	setDeckCards: (cards) => set({ deckCards: cards }),
	setSelectedCardIndex: (index) => set({ selectedCardIndex: index }),
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
	setSelectedDeck: (deck) => {
		useMetaStore.getState().setSelectedDeck(deck);
		set({ selectedDeck: deck });
	},
	setBossHp: (bossHp) => set({ bossHp }),
	setBossWarningVisible: (v) => set({ bossWarningVisible: v }),
	setGameOverStats: (stats) => set({ gameOverStats: stats }),
}));
