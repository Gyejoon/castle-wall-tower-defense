import { EventBus, soundGenerator } from '@gld/phaser-game';
import {
	type CombatHudState,
	DEFAULT_DECK,
	DEFAULT_DECK_IDS,
	type DeckCardDef,
	INITIAL_ENERGY,
	INITIAL_PLAYER_HP,
	PHASE_A_MAP_ID,
	type PlacementFailureReason,
	type WavePhase,
} from '@gld/shared';
import { create } from 'zustand';
import { useMetaStore } from './metaStore';

export type RunStatus =
	| 'lobby'
	| 'metaForge'
	| 'building'
	| 'running'
	| 'victory'
	| 'defeat';
export type LobbyTab = 'home' | 'collection' | 'settings';
export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface UiToast {
	id: number;
	message: React.ReactNode;
	tone: ToastTone;
}

type WavePreviewGroup = {
	unitId: string;
	unitName: string;
	count: number;
};

export interface BossHpEntry {
	unitId: string;
	defId: string;
	hp: number;
	maxHp: number;
	phase: 1 | 2;
}

/** Phaser emits wavesCleared~goldEarned; xpEarned is computed in the React layer via battleXp(). */
export interface GameOverStats {
	wavesCleared: number;
	totalWaves: number;
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
	bgmVolume: number;
	sfxVolume: number;
	colorblindMode: 'off' | 'protan' | 'deutan' | 'tritan';
	screenShake: boolean;
	playerTowerCount: number;
	combatHud: CombatHudState;
	toast: UiToast | null;
	selectedDeck: string[];
	bossHpMap: Record<string, BossHpEntry>;
	bossWarningVisible: boolean;
	gameOverStats: GameOverStats | null;
	tutorialStep: number | null;
	tutorialMessage: string | null;
	gameSpeed: 1 | 2 | 3;

	setRunStatus: (status: RunStatus) => void;
	setGameReady: (ready: boolean) => void;
	setEnergy: (energy: number) => void;
	setLives: (lives: number) => void;
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
	pushToast: (message: React.ReactNode, tone?: ToastTone) => void;
	clearToast: () => void;
	resetRun: () => void;
	enterLobby: () => void;
	startPhaseA: () => void;
	/** Phase 9 will wire this to a MetaForge page; today it's a stub toast. */
	enterMetaForge: () => void;
	setBgmVolume: (v: number) => void;
	setSfxVolume: (v: number) => void;
	setColorblindMode: (mode: 'off' | 'protan' | 'deutan' | 'tritan') => void;
	toggleScreenShake: () => void;
	setSelectedDeck: (deck: string[]) => void;
	upsertBossHp: (entry: BossHpEntry) => void;
	removeBossHp: (unitId: string) => void;
	clearAllBossHp: () => void;
	setBossWarningVisible: (v: boolean) => void;
	setGameOverStats: (stats: GameOverStats | null) => void;
	setTutorialStep: (step: number | null) => void;
	setTutorialMessage: (msg: string | null) => void;
	setGameSpeed: (speed: 1 | 2 | 3) => void;
}

const createCombatHud = (): CombatHudState => ({
	currentSlot: 1,
	phase: 'combat',
	bossWarning: false,
	timerLabel: '',
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
	bossHpMap: {} as Record<string, BossHpEntry>,
	bossWarningVisible: false,
	gameOverStats: null,
	tutorialStep: null,
	tutorialMessage: null,
	gameSpeed: 1 as 1 | 2 | 3,
});

export const useGameStore = create<GameStoreState>()((set) => ({
	runId: 0,
	runStatus: 'lobby',
	selectedMapId: PHASE_A_MAP_ID,
	lobbyTab: 'home',
	bgmVolume: useMetaStore.getState().settings?.bgmVolume ?? 0.7,
	sfxVolume: useMetaStore.getState().settings?.sfxVolume ?? 0.8,
	colorblindMode: useMetaStore.getState().settings?.colorblindMode ?? 'off',
	screenShake: useMetaStore.getState().settings?.screenShake ?? true,
	selectedDeck: useMetaStore.getState().selectedDeck ?? DEFAULT_DECK_IDS,
	...createRunState(),

	setRunStatus: (status) =>
		set((state) =>
			state.runStatus === status ? state : { runStatus: status, toast: null },
		),
	setGameReady: (ready) => set({ gameReady: ready }),
	setEnergy: (energy) => set({ energy }),
	setLives: (lives) => set({ lives }),
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
	resetRun: () => {
		set((state) => ({
			runId: state.runId + 1,
			runStatus: 'building',
			lobbyTab: 'home',
			selectedMapId: PHASE_A_MAP_ID,
			...createRunState(),
		}));
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
	startPhaseA: () => {
		set((state) => ({
			runId: state.runId + 1,
			runStatus: 'building',
			selectedMapId: PHASE_A_MAP_ID,
			...createRunState(),
		}));
		EventBus.emit('request-set-speed', { multiplier: 1 });
	},
	enterMetaForge: () => {
		// Phase 9.3: navigate to the dedicated MetaForge page. Run state
		// is reset so we don't carry a stale battle into a later
		// `enterLobby()` → `startPhaseA()` sequence.
		set((state) => ({
			runId: state.runId + 1,
			runStatus: 'metaForge',
			lobbyTab: 'home',
			...createRunState(),
		}));
	},
	setBgmVolume: (v) => {
		useMetaStore.getState().updateSettings({ bgmVolume: v });
		set({ bgmVolume: v });
	},
	setSfxVolume: (v) => {
		useMetaStore.getState().updateSettings({ sfxVolume: v });
		set({ sfxVolume: v });
		soundGenerator.setMasterVolume(v);
	},
	setColorblindMode: (mode) => {
		useMetaStore.getState().updateSettings({ colorblindMode: mode });
		set({ colorblindMode: mode });
	},
	toggleScreenShake: () =>
		set((state) => {
			const next = !state.screenShake;
			useMetaStore.getState().updateSettings({ screenShake: next });
			return { screenShake: next };
		}),
	setSelectedDeck: (deck) => {
		useMetaStore.getState().setSelectedDeck(deck);
		set({ selectedDeck: deck });
	},
	upsertBossHp: (entry) =>
		set((state) => ({
			bossHpMap: { ...state.bossHpMap, [entry.unitId]: entry },
		})),
	removeBossHp: (unitId) =>
		set((state) => {
			const { [unitId]: _, ...rest } = state.bossHpMap;
			return { bossHpMap: rest };
		}),
	clearAllBossHp: () => set({ bossHpMap: {} }),
	setBossWarningVisible: (v) => set({ bossWarningVisible: v }),
	setGameOverStats: (stats) => set({ gameOverStats: stats }),
	setTutorialStep: (step) => set({ tutorialStep: step }),
	setTutorialMessage: (msg) => set({ tutorialMessage: msg }),
	setGameSpeed: (speed) => {
		set({ gameSpeed: speed });
		EventBus.emit('request-set-speed', { multiplier: speed });
	},
}));
