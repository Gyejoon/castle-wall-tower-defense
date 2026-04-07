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

	it('tracks placement feedback', () => {
		expect(useGameStore.getState().placementFeedback).toBeNull();
		useGameStore.getState().setPlacementFeedback('combat_phase');
		expect(useGameStore.getState().placementFeedback).toBe('combat_phase');
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

	it('drops stale PvP mirror state from the store contract', () => {
		const state = useGameStore.getState() as Record<string, unknown>;
		expect('activeTab' in state).toBe(false);
		expect('opponentHp' in state).toBe(false);
		expect('opponentEnergy' in state).toBe(false);
		expect('opponentTowerCount' in state).toBe(false);
		expect('setOpponentState' in state).toBe(false);
	});

	it('drops HUD state that is now managed by Phaser UIScene', () => {
		const state = useGameStore.getState() as Record<string, unknown>;
		expect('lives' in state).toBe(false);
		expect('energy' in state).toBe(false);
		expect('combatHud' in state).toBe(false);
		expect('bossHp' in state).toBe(false);
		expect('deckCards' in state).toBe(false);
		expect('selectedCardIndex' in state).toBe(false);
		expect('playerTowerCount' in state).toBe(false);
		expect('wave' in state).toBe(false);
		expect('wavePhase' in state).toBe(false);
		expect('countdown' in state).toBe(false);
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

	it('enterLobby resets to lobby', () => {
		useGameStore.getState().resetRun();
		useGameStore.getState().setLobbyTab('collection');
		useGameStore.getState().enterLobby();

		expect(useGameStore.getState().runStatus).toBe('lobby');
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

	it('resets transient state on resetRun', () => {
		const initialRunId = useGameStore.getState().runId;

		useGameStore.getState().setGameReady(true);
		useGameStore.getState().setRunStatus('defeat');
		useGameStore.getState().setPlacementFeedback('combat_phase');
		useGameStore.getState().setLobbyTab('settings');
		useGameStore.getState().pushToast('합성 실패', 'error');

		useGameStore.getState().resetRun();

		expect(useGameStore.getState().runId).toBe(initialRunId + 1);
		expect(useGameStore.getState().runStatus).toBe('building');
		expect(useGameStore.getState().gameReady).toBe(false);
		expect(useGameStore.getState().placementFeedback).toBeNull();
		expect(useGameStore.getState().lobbyTab).toBe('home');
		expect(useGameStore.getState().toast).toBeNull();
	});
});
