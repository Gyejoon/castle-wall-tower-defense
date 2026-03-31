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

	it('starts a run from loading state', () => {
		useGameStore.getState().resetRun();
		expect(useGameStore.getState().runStatus).toBe('loading');
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
		const s = useGameStore.getState();
		expect(s.opponentHp).toBe(5);
		expect(s.opponentGold).toBe(200);
		expect(s.opponentTowerCount).toBe(3);
	});

	it('enterLobby resets to lobby status', () => {
		useGameStore.getState().resetRun();
		useGameStore.getState().setGold(999);
		useGameStore.getState().enterLobby();
		expect(useGameStore.getState().runStatus).toBe('lobby');
		expect(useGameStore.getState().gold).toBe(INITIAL_GOLD);
	});

	it('toggleSound flips soundEnabled', () => {
		expect(useGameStore.getState().soundEnabled).toBe(true);
		useGameStore.getState().toggleSound();
		expect(useGameStore.getState().soundEnabled).toBe(false);
		useGameStore.getState().toggleSound();
		expect(useGameStore.getState().soundEnabled).toBe(true);
	});

	it('resets a run to default combat HUD resources and clears transient state', () => {
		const initialRunId = useGameStore.getState().runId;

		useGameStore.getState().setGameReady(true);
		useGameStore.getState().setGold(10);
		useGameStore.getState().setLives(3);
		useGameStore.getState().setSelectedTower('laser');
		useGameStore.getState().setRunStatus('defeat');
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
		expect(useGameStore.getState().runStatus).toBe('loading');
		expect(useGameStore.getState().gameReady).toBe(false);
		expect(useGameStore.getState().gold).toBe(INITIAL_GOLD);
		expect(useGameStore.getState().lives).toBe(INITIAL_PLAYER_HP);
		expect(useGameStore.getState().selectedTowerId).toBeNull();
		expect(useGameStore.getState().placementFeedback).toBeNull();
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
