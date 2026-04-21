import { describe, expect, it, vi } from 'vitest';
import { GameStateManager } from '../../src/scenes/runtime/GameStateManager';

function make(opts: { initialHp?: number } = {}) {
	const emit = vi.fn();
	const onEndGame = vi.fn();
	const onExitSideEffect = vi.fn();
	const state = new GameStateManager({
		initialHp: opts.initialHp ?? 10,
		emit: emit as never,
		onEndGame,
		onExitSideEffect,
	});
	return { state, emit, onEndGame, onExitSideEffect };
}

describe('GameStateManager', () => {
	it('starts with initialHp and non-game-over', () => {
		const { state } = make({ initialHp: 25 });
		expect(state.getHp()).toBe(25);
		expect(state.isGameOver()).toBe(false);
		expect(state.getGoldEarned()).toBe(0);
		expect(state.getSpeedMultiplier()).toBe(1);
		expect(state.getScaledTime()).toBe(0);
	});

	it('tick returns scaledDelta and accumulates scaledGameTime', () => {
		const { state } = make();
		expect(state.tick(16)).toBe(16);
		expect(state.getScaledTime()).toBe(16);
		state.setSpeed(2);
		expect(state.tick(16)).toBe(32);
		expect(state.getScaledTime()).toBe(48);
		state.setSpeed(3);
		expect(state.tick(10)).toBe(30);
	});

	it('addGold accumulates and getGoldEarned reports', () => {
		const { state } = make();
		state.addGold(10);
		state.addGold(5);
		expect(state.getGoldEarned()).toBe(15);
	});

	it('applyExits with a single normal exit reduces HP by 1 and emits player-damaged', () => {
		const { state, emit, onExitSideEffect } = make({ initialHp: 3 });
		state.applyExits([{ id: 'u1', isBoss: false }]);
		expect(state.getHp()).toBe(2);
		expect(emit).toHaveBeenCalledWith('player-damaged', {
			playerId: 'local',
			damage: 1,
			remainingHp: 2,
		});
		expect(onExitSideEffect).toHaveBeenCalledWith(2, false);
		expect(state.isGameOver()).toBe(false);
	});

	it('applyExits that brings HP to 0 triggers defeat via onEndGame', () => {
		const { state, onEndGame, onExitSideEffect } = make({ initialHp: 1 });
		state.applyExits([{ id: 'u1', isBoss: false }]);
		expect(state.getHp()).toBe(0);
		expect(state.isGameOver()).toBe(true);
		expect(onEndGame).toHaveBeenCalledWith({
			result: 'defeat',
			reason: 'base_hp_depleted',
		});
		// Final side-effect with HP=0 and boss-leak flag=false.
		expect(onExitSideEffect).toHaveBeenLastCalledWith(0, false);
	});

	it('boss exit triggers instant defeat regardless of remaining HP', () => {
		const { state, onEndGame, onExitSideEffect } = make({ initialHp: 99 });
		state.applyExits([{ id: 'boss-1', isBoss: true }]);
		expect(state.isGameOver()).toBe(true);
		expect(onEndGame).toHaveBeenCalledWith({
			result: 'defeat',
			reason: 'base_hp_depleted',
		});
		expect(onExitSideEffect).toHaveBeenLastCalledWith(0, true);
	});

	it('endGame is idempotent', () => {
		const { state, onEndGame } = make();
		state.endGame({ result: 'defeat', reason: 'base_hp_depleted' });
		state.endGame({ result: 'victory', reason: 'all_waves_cleared' });
		expect(onEndGame).toHaveBeenCalledTimes(1);
	});

	it('checkVictoryCondition fires only when phase=ended AND no units remain', () => {
		const { state, onEndGame } = make();
		state.checkVictoryCondition('running', false, false);
		expect(onEndGame).not.toHaveBeenCalled();
		state.checkVictoryCondition('ended', true, false);
		expect(onEndGame).not.toHaveBeenCalled();
		state.checkVictoryCondition('ended', false, true);
		expect(onEndGame).not.toHaveBeenCalled();
		state.checkVictoryCondition('ended', false, false);
		expect(onEndGame).toHaveBeenCalledWith({
			result: 'victory',
			reason: 'all_waves_cleared',
		});
	});

	it('setSpeed(2) makes subsequent tick(16) return 32', () => {
		const { state } = make();
		state.setSpeed(2);
		expect(state.tick(16)).toBe(32);
	});

	it('applyExits is a no-op after game-over', () => {
		const { state, emit } = make({ initialHp: 3 });
		state.endGame({ result: 'defeat', reason: 'base_hp_depleted' });
		state.applyExits([{ id: 'u1', isBoss: false }]);
		expect(emit).not.toHaveBeenCalled();
	});
});
