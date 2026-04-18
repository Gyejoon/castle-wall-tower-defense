import { createDefaultSave } from '@gld/shared';
import { act, fireEvent, render } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import { useGameStore } from '../src/stores/gameStore';
import { useMetaStore } from '../src/stores/metaStore';

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
	var __mergeModeBusHarness__: EventBusHarness | undefined;
}

function getHarness(): EventBusHarness {
	if (!globalThis.__mergeModeBusHarness__) {
		throw new Error('merge-mode bus harness not initialized');
	}
	return globalThis.__mergeModeBusHarness__;
}

if (typeof document === 'undefined') {
	const dom = new JSDOM('<!doctype html><html><body></body></html>');
	globalThis.window = dom.window as unknown as Window & typeof globalThis;
	globalThis.document = dom.window.document;
	globalThis.navigator = dom.window.navigator;
	globalThis.HTMLElement = dom.window.HTMLElement;
	globalThis.Node = dom.window.Node;
	globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
	globalThis.IS_REACT_ACT_ENVIRONMENT = true;
	if (!globalThis.requestAnimationFrame) {
		globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
			setTimeout(() => cb(Date.now()), 16);
		globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
	}
}

vi.mock('../src/game/PhaserGame', () => ({
	PhaserGame: () => <div data-testid="phaser-game" />,
}));

vi.mock('@gld/phaser-game', () => {
	const listeners = new Map<string, Set<EventHandler>>();
	const emitSpy = vi.fn((event: string, payload?: unknown) => {
		listeners.get(event)?.forEach((handler) => handler(payload));
	});
	const destroySpy = vi.fn();
	const startGameSpy = vi.fn(() => ({ destroy: destroySpy }));
	const offSpy = vi.fn((event: string, handler: EventHandler) => {
		listeners.get(event)?.delete(handler);
	});
	const removeAllListenersSpy = vi.fn(() => {
		listeners.clear();
	});

	globalThis.__mergeModeBusHarness__ = {
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
				const set = listeners.get(event) ?? new Set<EventHandler>();
				set.add(handler);
				listeners.set(event, set);
			},
			off: offSpy,
			removeAllListeners: removeAllListenersSpy,
		},
		soundGenerator: {
			setMasterVolume: vi.fn(),
			unlock: vi.fn().mockResolvedValue(undefined),
		},
	};
});

let GamePage: typeof import('../src/pages/GamePage').GamePage;

describe('GamePage — merge-mode [F10]', () => {
	beforeAll(async () => {
		({ GamePage } = await import('../src/pages/GamePage'));
	});

	beforeEach(() => {
		const { emitSpy, listeners, offSpy, startGameSpy, destroySpy } =
			getHarness();
		emitSpy.mockClear();
		startGameSpy.mockClear();
		destroySpy.mockClear();
		offSpy.mockClear();
		listeners.clear();
		useMetaStore.setState(createDefaultSave());
		useGameStore.setState(useGameStore.getInitialState());
		useGameStore.getState().resetRun();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('enter-merge-mode shows the target-picker banner', () => {
		const { emitSpy } = getHarness();
		const view = render(<GamePage />);

		act(() => {
			emitSpy('enter-merge-mode', { sourceId: '3,4' });
		});

		expect(view.getByTestId('merge-mode-banner')).toBeDefined();
	});

	it('merge-failed clears merge-mode', () => {
		const { emitSpy } = getHarness();
		const view = render(<GamePage />);

		act(() => {
			emitSpy('enter-merge-mode', { sourceId: '3,4' });
		});
		expect(view.queryByTestId('merge-mode-banner')).not.toBeNull();

		act(() => {
			emitSpy('merge-failed', {
				fromCol: 3,
				fromRow: 4,
				toCol: 5,
				toRow: 5,
				reason: 'incompatible-pair',
			});
		});
		expect(view.queryByTestId('merge-mode-banner')).toBeNull();
	});

	it('towers-merged clears merge-mode', () => {
		const { emitSpy } = getHarness();
		const view = render(<GamePage />);

		act(() => {
			emitSpy('enter-merge-mode', { sourceId: '3,4' });
		});
		expect(view.queryByTestId('merge-mode-banner')).not.toBeNull();

		act(() => {
			emitSpy('towers-merged', {
				col: 5,
				row: 5,
				towerId: 'archer',
				fromA: 'a',
				fromB: 'b',
				toInstanceId: 'tower_1',
				toTowerId: 'archer',
				fromTier: 1,
				toTier: 2,
			});
		});
		expect(view.queryByTestId('merge-mode-banner')).toBeNull();
	});

	it('ESC keydown clears merge-mode', () => {
		const { emitSpy } = getHarness();
		const view = render(<GamePage />);

		act(() => {
			emitSpy('enter-merge-mode', { sourceId: '3,4' });
		});
		expect(view.queryByTestId('merge-mode-banner')).not.toBeNull();

		act(() => {
			window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
		});
		expect(view.queryByTestId('merge-mode-banner')).toBeNull();
	});

	it('cancel button clears merge-mode', () => {
		const { emitSpy } = getHarness();
		const view = render(<GamePage />);

		act(() => {
			emitSpy('enter-merge-mode', { sourceId: '3,4' });
		});
		const cancelBtn = view.getByTestId('merge-mode-cancel');
		act(() => {
			fireEvent.click(cancelBtn);
		});
		expect(view.queryByTestId('merge-mode-banner')).toBeNull();
	});

	it('second tower-selected while in merge-mode fires request-merge-towers', () => {
		const { emitSpy } = getHarness();
		render(<GamePage />);

		act(() => {
			emitSpy('enter-merge-mode', { sourceId: '3,4' });
		});

		act(() => {
			emitSpy('tower-selected', {
				towerDefId: 'archer',
				towerName: '궁수',
				col: 5,
				row: 5,
				refund: 10,
				tier: 1,
			});
		});

		const mergeCalls = emitSpy.mock.calls.filter(
			([evt]) => evt === 'request-merge-towers',
		);
		expect(mergeCalls.length).toBe(1);
		expect(mergeCalls[0][1]).toEqual({
			fromCol: 3,
			fromRow: 4,
			toCol: 5,
			toRow: 5,
		});
	});
});
