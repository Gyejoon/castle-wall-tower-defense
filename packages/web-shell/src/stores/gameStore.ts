import {
	type CombatHudState,
	INITIAL_GOLD,
	INITIAL_PLAYER_HP,
	type PlacementFailureReason,
	type TowerDef,
} from '@gld/shared';
import { create } from 'zustand';

export type RunStatus = 'lobby' | 'loading' | 'running' | 'victory' | 'defeat';
export type FieldTab = 'player' | 'opponent';
export type ToastTone = 'info' | 'success' | 'warning' | 'error';

export interface UiToast {
	id: number;
	message: string;
	tone: ToastTone;
}

interface GameStoreState {
	runId: number;
	runStatus: RunStatus;
	gameReady: boolean;
	gold: number;
	lives: number;
	selectedTowerId: string | null;
	rolledTower: TowerDef | null;
	placementFeedback: PlacementFailureReason | null;
	soundEnabled: boolean;
	activeTab: FieldTab;
	playerTowerCount: number;
	opponentHp: number;
	opponentGold: number;
	opponentTowerCount: number;
	combatHud: CombatHudState;
	toast: UiToast | null;

	setRunStatus: (status: RunStatus) => void;
	setGameReady: (ready: boolean) => void;
	setGold: (gold: number) => void;
	setLives: (lives: number) => void;
	setSelectedTower: (towerId: string | null) => void;
	setRolledTower: (tower: TowerDef | null) => void;
	setPlacementFeedback: (reason: PlacementFailureReason | null) => void;
	setActiveTab: (tab: FieldTab) => void;
	setPlayerTowerCount: (count: number) => void;
	setOpponentState: (state: {
		hp: number;
		gold: number;
		towerCount: number;
	}) => void;
	patchCombatHud: (patch: Partial<CombatHudState>) => void;
	pushToast: (message: string, tone?: ToastTone) => void;
	clearToast: () => void;
	resetRun: () => void;
	enterLobby: () => void;
	toggleSound: () => void;
}

const createCombatHud = (): CombatHudState => ({
	currentSlot: 1,
	phase: 'running',
	pressureTokens: 0,
	queuedPressureEffect: null,
	buyCooldownMs: 0,
	bossWarning: false,
	suddenDeath: false,
	timerLabel: 'Slot 1',
});

const createRunState = () => ({
	gameReady: false,
	gold: INITIAL_GOLD,
	lives: INITIAL_PLAYER_HP,
	selectedTowerId: null,
	rolledTower: null,
	placementFeedback: null,
	activeTab: 'player' as FieldTab,
	playerTowerCount: 0,
	opponentHp: INITIAL_PLAYER_HP,
	opponentGold: INITIAL_GOLD,
	opponentTowerCount: 0,
	combatHud: createCombatHud(),
	toast: null,
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
	setPlacementFeedback: (reason) => set({ placementFeedback: reason }),
	setActiveTab: (tab) => set({ activeTab: tab }),
	setPlayerTowerCount: (count) => set({ playerTowerCount: count }),
	setOpponentState: (state) =>
		set({
			opponentHp: state.hp,
			opponentGold: state.gold,
			opponentTowerCount: state.towerCount,
		}),
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
			runStatus: 'loading',
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
