import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from '../src/stores/gameStore';

type EventHandler = (payload?: unknown) => void;

type EventBusHarness = {
	listeners: Map<string, Set<EventHandler>>;
	emitSpy: ReturnType<typeof vi.fn>;
	startGameSpy: ReturnType<typeof vi.fn>;
	destroySpy: ReturnType<typeof vi.fn>;
	offSpy: ReturnType<typeof vi.fn>;
	removeAllListenersSpy: ReturnType<typeof vi.fn>;
};

declare global {
	// eslint-disable-next-line no-var
	var __eventBusHarness__: EventBusHarness | undefined;
}

function getEventBusHarness(): EventBusHarness {
	if (!globalThis.__eventBusHarness__) {
		throw new Error('event bus harness not initialized');
	}

	return globalThis.__eventBusHarness__;
}

vi.mock('@gld/phaser-game', () => {
	const listeners = new Map<string, Set<EventHandler>>();
	const emitSpy = vi.fn();
	const destroySpy = vi.fn();
	const startGameSpy = vi.fn(() => ({ destroy: destroySpy }));
	const offSpy = vi.fn((event: string, handler: EventHandler) => {
		listeners.get(event)?.delete(handler);
	});
	const removeAllListenersSpy = vi.fn(() => {
		listeners.clear();
	});

	globalThis.__eventBusHarness__ = {
		listeners,
		emitSpy,
		startGameSpy,
		destroySpy,
		offSpy,
		removeAllListenersSpy,
	};

	return {
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
	};
});

import { PhaserGame } from '../src/game/PhaserGame';

describe('PhaserGame', () => {
	beforeEach(() => {
		const {
			listeners,
			startGameSpy,
			destroySpy,
			offSpy,
			removeAllListenersSpy,
		} = getEventBusHarness();
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
});
