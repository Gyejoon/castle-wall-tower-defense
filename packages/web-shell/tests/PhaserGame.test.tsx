import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../src/stores/gameStore';

type EventHandler = (payload?: unknown) => void;

// Use vi.hoisted so mocks are defined before vi.mock factory runs,
// and references remain stable even if another file also mocks @gld/phaser-game.
const {
	listeners,
	emitSpy,
	startGameSpy,
	destroySpy,
	offSpy,
	removeAllListenersSpy,
} = vi.hoisted(() => {
	const _listeners = new Map<string, Set<EventHandler>>();
	const _destroySpy = vi.fn();
	const _registrySetSpy = vi.fn();
	return {
		listeners: _listeners,
		emitSpy: vi.fn(),
		startGameSpy: vi.fn(() => ({
			destroy: _destroySpy,
			registry: { set: _registrySetSpy },
		})),
		destroySpy: _destroySpy,
		offSpy: vi.fn((event: string, handler: EventHandler) => {
			_listeners.get(event)?.delete(handler);
		}),
		removeAllListenersSpy: vi.fn(() => {
			_listeners.clear();
		}),
	};
});

vi.mock('@gld/phaser-game', () => ({
	startGame: startGameSpy,
	EventBus: {
		emit: emitSpy,
		on: (event: string, handler: EventHandler) => {
			const handlers = listeners.get(event) ?? new Set<EventHandler>();
			handlers.add(handler);
			listeners.set(event, handlers);
		},
		off: offSpy,
		removeAllListeners: removeAllListenersSpy,
	},
}));

import { PhaserGame } from '../src/game/PhaserGame';

describe('PhaserGame', () => {
	beforeEach(() => {
		listeners.clear();
		startGameSpy.mockClear();
		destroySpy.mockClear();
		offSpy.mockClear();
		removeAllListenersSpy.mockClear();
		useGameStore.setState(useGameStore.getInitialState());
	});

	it('resets gameReady state on unmount', () => {
		const view = render(<PhaserGame />);

		view.unmount();

		expect(useGameStore.getState().gameReady).toBe(false);
	});

	it('registers the game-ready listener before starting Phaser', () => {
		render(<PhaserGame />);

		expect(listeners.get('game-ready')?.size ?? 0).toBe(1);
		expect(startGameSpy).toHaveBeenCalledOnce();
	});

	it('flips gameReady when the game-ready event arrives', () => {
		render(<PhaserGame />);

		const onReady = Array.from(listeners.get('game-ready') ?? [])[0];
		onReady?.();

		expect(useGameStore.getState().gameReady).toBe(true);
	});
});
