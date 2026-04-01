import { INITIAL_GOLD, INITIAL_PLAYER_HP } from '@gld/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from '../src/stores/gameStore';

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

	it('tracks gold and lives', () => {
		expect(useGameStore.getState().gold).toBe(INITIAL_GOLD);
		expect(useGameStore.getState().lives).toBe(INITIAL_PLAYER_HP);
		useGameStore.getState().setGold(150);
		useGameStore.getState().setLives(15);
		expect(useGameStore.getState().gold).toBe(150);
		expect(useGameStore.getState().lives).toBe(15);
	});

	it('tracks selected tower and placement feedback', () => {
		expect(useGameStore.getState().selectedTowerId).toBeNull();
		expect(useGameStore.getState().placementFeedback).toBeNull();
		useGameStore.getState().setSelectedTower('laser');
		useGameStore.getState().setPlacementFeedback('combat_phase');
		expect(useGameStore.getState().selectedTowerId).toBe('laser');
		expect(useGameStore.getState().placementFeedback).toBe('combat_phase');
	});

	it('tracks wave metadata', () => {
		expect(useGameStore.getState().wave).toBe(0);
		expect(useGameStore.getState().wavePhase).toBe('running');
		expect(useGameStore.getState().countdown).toBe(0);

		useGameStore.getState().setWave(4);
		useGameStore.getState().setWavePhase('boss');
		useGameStore.getState().setCountdown(2);

		expect(useGameStore.getState().wave).toBe(4);
		expect(useGameStore.getState().wavePhase).toBe('boss');
		expect(useGameStore.getState().countdown).toBe(2);
	});

	it('patches combat HUD instead of storing build/combat countdown separately', () => {
		useGameStore.getState().patchCombatHud({
			currentSlot: 9,
			phase: 'boss',
			pressureTokens: 1,
			queuedPressureEffect: 'mixed_pressure',
			buyCooldownMs: 900,
			bossWarning: true,
			timerLabel: 'Boss 9',
		});

		expect(useGameStore.getState().combatHud).toEqual(
			expect.objectContaining({
				currentSlot: 9,
				phase: 'boss',
				pressureTokens: 1,
				queuedPressureEffect: 'mixed_pressure',
				buyCooldownMs: 900,
				bossWarning: true,
				timerLabel: 'Boss 9',
			}),
		);
	});

	it('stores toast state for cooldown, pressure, and merge feedback', () => {
		useGameStore.getState().pushToast('압박 +1', 'success');

		expect(useGameStore.getState().toast).toEqual(
			expect.objectContaining({
				message: '압박 +1',
				tone: 'success',
			}),
		);

		useGameStore.getState().clearToast();
		expect(useGameStore.getState().toast).toBeNull();
	});

	it('setOpponentState updates opponent fields', () => {
		useGameStore
			.getState()
			.setOpponentState({ hp: 5, gold: 200, towerCount: 3 });
		const state = useGameStore.getState();
		expect(state.opponentHp).toBe(5);
		expect(state.opponentGold).toBe(200);
		expect(state.opponentTowerCount).toBe(3);
	});

	it('setActiveTab switches tab', () => {
		expect(useGameStore.getState().activeTab).toBe('player');
		useGameStore.getState().setActiveTab('opponent');
		expect(useGameStore.getState().activeTab).toBe('opponent');
	});

	it('starts with lobbyTab home and allows switching', () => {
		expect(useGameStore.getState().lobbyTab).toBe('home');
		useGameStore.getState().setLobbyTab('collection');
		expect(useGameStore.getState().lobbyTab).toBe('collection');
		useGameStore.getState().setLobbyTab('settings');
		expect(useGameStore.getState().lobbyTab).toBe('settings');
	});

	it('enterLobby resets lobby state and gold', () => {
		useGameStore.getState().resetRun();
		useGameStore.getState().setGold(999);
		useGameStore.getState().setLobbyTab('collection');
		useGameStore.getState().enterLobby();

		expect(useGameStore.getState().runStatus).toBe('lobby');
		expect(useGameStore.getState().gold).toBe(INITIAL_GOLD);
		expect(useGameStore.getState().lobbyTab).toBe('home');
	});

	it('toggles sound and accessibility feedback flags', () => {
		expect(useGameStore.getState().soundEnabled).toBe(true);
		expect(useGameStore.getState().screenShake).toBe(true);
		expect(useGameStore.getState().showDamageNumbers).toBe(true);

		useGameStore.getState().toggleSound();
		useGameStore.getState().toggleScreenShake();
		useGameStore.getState().toggleDamageNumbers();

		expect(useGameStore.getState().soundEnabled).toBe(false);
		expect(useGameStore.getState().screenShake).toBe(false);
		expect(useGameStore.getState().showDamageNumbers).toBe(false);
	});

	it('resets a run to default combat resources and clears transient state', () => {
		const initialRunId = useGameStore.getState().runId;

		useGameStore.getState().setGameReady(true);
		useGameStore.getState().setGold(10);
		useGameStore.getState().setLives(3);
		useGameStore.getState().setSelectedTower('laser');
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
		useGameStore.getState().patchCombatHud({
			currentSlot: 18,
			phase: 'sudden_death',
			pressureTokens: 2,
			queuedPressureEffect: 'breach_pressure',
			buyCooldownMs: 700,
			bossWarning: true,
			suddenDeath: true,
			timerLabel: 'Sudden Death',
		});
		useGameStore.getState().pushToast('합성 실패', 'error');

		useGameStore.getState().resetRun();

		expect(useGameStore.getState().runId).toBe(initialRunId + 1);
		expect(useGameStore.getState().runStatus).toBe('building');
		expect(useGameStore.getState().gameReady).toBe(false);
		expect(useGameStore.getState().gold).toBe(INITIAL_GOLD);
		expect(useGameStore.getState().lives).toBe(INITIAL_PLAYER_HP);
		expect(useGameStore.getState().selectedTowerId).toBeNull();
		expect(useGameStore.getState().placementFeedback).toBeNull();
		expect(useGameStore.getState().wave).toBe(0);
		expect(useGameStore.getState().wavePhase).toBe('running');
		expect(useGameStore.getState().countdown).toBe(0);
		expect(useGameStore.getState().wavePreview).toBeNull();
		expect(useGameStore.getState().lobbyTab).toBe('home');
		expect(useGameStore.getState().toast).toBeNull();
		expect(useGameStore.getState().combatHud).toEqual(
			expect.objectContaining({
				currentSlot: 1,
				phase: 'running',
				pressureTokens: 0,
				queuedPressureEffect: null,
				buyCooldownMs: 0,
				bossWarning: false,
				suddenDeath: false,
			}),
		);
	});
});
