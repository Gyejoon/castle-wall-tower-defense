import { INITIAL_ENERGY, INITIAL_PLAYER_HP } from '@gld/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../src/stores/gameStore';

vi.mock('@gld/phaser-game', () => ({
	EventBus: {
		emit: vi.fn(),
		on: vi.fn(),
		off: vi.fn(),
		removeAllListeners: vi.fn(),
	},
}));

describe('gameStore', () => {
	beforeEach(() => {
		useGameStore.setState(useGameStore.getInitialState());
	});

	it('starts in lobby screen', () => {
		expect(useGameStore.getState().runStatus).toBe('lobby');
	});

	it('starts a run from building state', () => {
		useGameStore.getState().resetRun();
		expect(useGameStore.getState().runStatus).toBe('building');
	});

	it('tracks game ready state', () => {
		expect(useGameStore.getState().gameReady).toBe(false);
		useGameStore.getState().setGameReady(true);
		expect(useGameStore.getState().gameReady).toBe(true);
	});

	it('tracks energy and lives', () => {
		expect(useGameStore.getState().energy).toBe(INITIAL_ENERGY);
		expect(useGameStore.getState().lives).toBe(INITIAL_PLAYER_HP);
		useGameStore.getState().setEnergy(15);
		useGameStore.getState().setLives(15);
		expect(useGameStore.getState().energy).toBe(15);
		expect(useGameStore.getState().lives).toBe(15);
	});

	it('tracks selected tower and placement feedback', () => {
		expect(useGameStore.getState().selectedTowerId).toBeNull();
		expect(useGameStore.getState().placementFeedback).toBeNull();
		useGameStore.getState().setSelectedTower('archer');
		useGameStore.getState().setPlacementFeedback('combat_phase');
		expect(useGameStore.getState().selectedTowerId).toBe('archer');
		expect(useGameStore.getState().placementFeedback).toBe('combat_phase');
	});

	it('tracks wave metadata', () => {
		expect(useGameStore.getState().wave).toBe(0);
		expect(useGameStore.getState().wavePhase).toBe('combat');
		expect(useGameStore.getState().countdown).toBe(0);

		useGameStore.getState().setWave(4);
		useGameStore.getState().setWavePhase('boss');
		useGameStore.getState().setCountdown(2);

		expect(useGameStore.getState().wave).toBe(4);
		expect(useGameStore.getState().wavePhase).toBe('boss');
		expect(useGameStore.getState().countdown).toBe(2);
	});

	it('patches the single-player combat HUD contract', () => {
		useGameStore.getState().patchCombatHud({
			currentSlot: 9,
			phase: 'boss',
			bossWarning: true,
			timerLabel: 'Boss 9',
		});

		expect(useGameStore.getState().combatHud).toEqual({
			currentSlot: 9,
			phase: 'boss',
			bossWarning: true,
			timerLabel: 'Boss 9',
		});
	});

	it('stores toast state for cooldown and merge feedback', () => {
		useGameStore.getState().pushToast('합성 실패', 'error');

		expect(useGameStore.getState().toast).toEqual(
			expect.objectContaining({
				message: '합성 실패',
				tone: 'error',
			}),
		);

		useGameStore.getState().clearToast();
		expect(useGameStore.getState().toast).toBeNull();
	});

	it('initializes deck cards from DEFAULT_DECK and tracks selection', () => {
		const { deckCards, selectedCardIndex } = useGameStore.getState();
		expect(deckCards).toHaveLength(4);
		expect(deckCards[0].towerDefId).toBe('archer');
		expect(selectedCardIndex).toBeNull();

		useGameStore.getState().setSelectedCardIndex(2);
		expect(useGameStore.getState().selectedCardIndex).toBe(2);

		useGameStore.getState().setSelectedCardIndex(null);
		expect(useGameStore.getState().selectedCardIndex).toBeNull();
	});

	it('resets deck state on resetRun', () => {
		useGameStore.getState().setSelectedCardIndex(3);
		useGameStore.getState().resetRun();
		expect(useGameStore.getState().selectedCardIndex).toBeNull();
		expect(useGameStore.getState().deckCards).toHaveLength(4);
	});

	it('tracks player tower count only', () => {
		expect(useGameStore.getState().playerTowerCount).toBe(0);
		useGameStore.getState().setPlayerTowerCount(3);
		expect(useGameStore.getState().playerTowerCount).toBe(3);
	});

	it('drops stale PvP mirror state from the store contract', () => {
		const state = useGameStore.getState() as Record<string, unknown>;
		expect('activeTab' in state).toBe(false);
		expect('opponentHp' in state).toBe(false);
		expect('opponentEnergy' in state).toBe(false);
		expect('opponentTowerCount' in state).toBe(false);
		expect('setOpponentState' in state).toBe(false);
	});

	it('starts with lobbyTab home and allows switching', () => {
		expect(useGameStore.getState().lobbyTab).toBe('home');
		useGameStore.getState().setLobbyTab('collection');
		expect(useGameStore.getState().lobbyTab).toBe('collection');
		useGameStore.getState().setLobbyTab('settings');
		expect(useGameStore.getState().lobbyTab).toBe('settings');
	});

	it('enterStageSelect sets runStatus to stageSelect', () => {
		expect(useGameStore.getState().runStatus).toBe('lobby');
		useGameStore.getState().enterStageSelect();
		expect(useGameStore.getState().runStatus).toBe('stageSelect');
		expect(useGameStore.getState().lobbyTab).toBe('home');
	});

	it('enterLobby resets lobby state and energy', () => {
		useGameStore.getState().resetRun();
		useGameStore.getState().setEnergy(999);
		useGameStore.getState().setLobbyTab('collection');
		useGameStore.getState().enterLobby();

		expect(useGameStore.getState().runStatus).toBe('lobby');
		expect(useGameStore.getState().energy).toBe(INITIAL_ENERGY);
		expect(useGameStore.getState().lobbyTab).toBe('home');
	});

	it('tracks volume settings for BGM and SFX', () => {
		expect(useGameStore.getState().bgmVolume).toBe(0.7);
		expect(useGameStore.getState().sfxVolume).toBe(0.8);

		useGameStore.getState().setBgmVolume(0);
		expect(useGameStore.getState().bgmVolume).toBe(0);

		useGameStore.getState().setSfxVolume(0.5);
		expect(useGameStore.getState().sfxVolume).toBe(0.5);
	});

	it('toggles accessibility feedback flags', () => {
		expect(useGameStore.getState().screenShake).toBe(true);
		expect(useGameStore.getState().showDamageNumbers).toBe(true);

		useGameStore.getState().toggleScreenShake();
		useGameStore.getState().toggleDamageNumbers();

		expect(useGameStore.getState().screenShake).toBe(false);
		expect(useGameStore.getState().showDamageNumbers).toBe(false);
	});

	it('setGameSpeed updates gameSpeed state', () => {
		const { setGameSpeed } = useGameStore.getState();
		setGameSpeed(2);
		expect(useGameStore.getState().gameSpeed).toBe(2);
	});

	it('resetRun resets gameSpeed to 1', () => {
		const { setGameSpeed, resetRun } = useGameStore.getState();
		setGameSpeed(2);
		resetRun();
		expect(useGameStore.getState().gameSpeed).toBe(1);
	});

	it('resets a run to default single-player combat resources and clears transient state', () => {
		const initialRunId = useGameStore.getState().runId;

		useGameStore.getState().setGameReady(true);
		useGameStore.getState().setEnergy(10);
		useGameStore.getState().setLives(3);
		useGameStore.getState().setSelectedTower('archer');
		useGameStore.getState().setWave(4);
		useGameStore.getState().setWavePhase('boss');
		useGameStore.getState().setCountdown(2);
		useGameStore
			.getState()
			.setWavePreview([
				{ unitId: 'goblin', unitName: '고블린 정찰병', count: 3 },
			]);
		useGameStore.getState().setRunStatus('defeat');
		useGameStore.getState().setPlacementFeedback('combat_phase');
		useGameStore.getState().setLobbyTab('settings');
		useGameStore.getState().setPlayerTowerCount(8);
		useGameStore.getState().patchCombatHud({
			currentSlot: 18,
			phase: 'boss',
			bossWarning: true,
			timerLabel: 'Boss 18',
		});
		useGameStore.getState().pushToast('합성 실패', 'error');

		useGameStore.getState().resetRun();

		expect(useGameStore.getState().runId).toBe(initialRunId + 1);
		expect(useGameStore.getState().runStatus).toBe('building');
		expect(useGameStore.getState().gameReady).toBe(false);
		expect(useGameStore.getState().energy).toBe(INITIAL_ENERGY);
		expect(useGameStore.getState().lives).toBe(INITIAL_PLAYER_HP);
		expect(useGameStore.getState().selectedTowerId).toBeNull();
		expect(useGameStore.getState().placementFeedback).toBeNull();
		expect(useGameStore.getState().wave).toBe(0);
		expect(useGameStore.getState().wavePhase).toBe('combat');
		expect(useGameStore.getState().countdown).toBe(0);
		expect(useGameStore.getState().wavePreview).toBeNull();
		expect(useGameStore.getState().lobbyTab).toBe('home');
		expect(useGameStore.getState().playerTowerCount).toBe(0);
		expect(useGameStore.getState().toast).toBeNull();
		expect(useGameStore.getState().combatHud).toEqual({
			currentSlot: 1,
			phase: 'combat',
			bossWarning: false,
			timerLabel: 'Slot 1',
		});
	});
});
