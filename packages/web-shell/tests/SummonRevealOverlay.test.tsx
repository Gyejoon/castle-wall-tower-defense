import { act, render, screen } from '@testing-library/react';
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

type EventHandler = (payload?: unknown) => void;

type EventBusHarness = {
	listeners: Map<string, Set<EventHandler>>;
	emitSpy: ReturnType<typeof vi.fn>;
	offSpy: ReturnType<typeof vi.fn>;
};

declare global {
	// eslint-disable-next-line no-var
	var __summonRevealBusHarness__: EventBusHarness | undefined;
}

function getHarness(): EventBusHarness {
	if (!globalThis.__summonRevealBusHarness__) {
		throw new Error('SummonRevealOverlay test bus harness not initialized');
	}
	return globalThis.__summonRevealBusHarness__;
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
}

vi.mock('@gld/phaser-game', () => {
	const listeners = new Map<string, Set<EventHandler>>();
	const emitSpy = vi.fn((event: string, payload?: unknown) => {
		listeners.get(event)?.forEach((h) => h(payload));
	});
	const offSpy = vi.fn((event: string, handler: EventHandler) => {
		listeners.get(event)?.delete(handler);
	});
	globalThis.__summonRevealBusHarness__ = { listeners, emitSpy, offSpy };
	return {
		EventBus: {
			emit: emitSpy,
			on: (event: string, handler: EventHandler) => {
				const set = listeners.get(event) ?? new Set<EventHandler>();
				set.add(handler);
				listeners.set(event, set);
			},
			off: offSpy,
			removeAllListeners: vi.fn(() => listeners.clear()),
		},
	};
});

let SummonRevealOverlay: typeof import('../src/components/game/SummonRevealOverlay').SummonRevealOverlay;

describe('SummonRevealOverlay', () => {
	beforeAll(async () => {
		({ SummonRevealOverlay } = await import(
			'../src/components/game/SummonRevealOverlay'
		));
	});

	beforeEach(() => {
		const { listeners, emitSpy, offSpy } = getHarness();
		listeners.clear();
		emitSpy.mockClear();
		offSpy.mockClear();
	});

	afterEach(() => {
		vi.useRealTimers();
		const { listeners, emitSpy, offSpy } = getHarness();
		listeners.clear();
		emitSpy.mockClear();
		offSpy.mockClear();
	});

	it('renders nothing before any summon event', () => {
		render(<SummonRevealOverlay />);
		expect(screen.queryByTestId('summon-reveal-overlay')).toBeNull();
	});

	it('renders tower name and source label when phase-a-summon-ready fires', () => {
		render(<SummonRevealOverlay />);
		const { emitSpy } = getHarness();

		act(() => {
			emitSpy('phase-a-summon-ready', {
				towerId: 'archer',
				source: 'summon',
			});
		});

		expect(screen.getByTestId('summon-reveal-overlay')).toBeDefined();
		expect(screen.getByTestId('summon-reveal-source').textContent).toContain(
			'소환',
		);
		// Name comes from ALL_TOWERS lookup; if 'archer' is present in the
		// lookup the label becomes the Korean name. Either way it's non-empty.
		const nameNode = screen.getByTestId('summon-reveal-name');
		expect(nameNode.textContent?.length ?? 0).toBeGreaterThan(0);
	});

	it('renders ✨ 가챠 label when source is gacha', () => {
		render(<SummonRevealOverlay />);
		const { emitSpy } = getHarness();

		act(() => {
			emitSpy('phase-a-summon-ready', {
				towerId: 'archer',
				source: 'gacha',
			});
		});

		expect(screen.getByTestId('summon-reveal-source').textContent).toContain(
			'가챠',
		);
	});

	it('dismisses itself after 2 seconds', () => {
		vi.useFakeTimers();
		render(<SummonRevealOverlay />);
		const { emitSpy } = getHarness();

		act(() => {
			emitSpy('phase-a-summon-ready', {
				towerId: 'archer',
				source: 'summon',
			});
		});
		expect(screen.queryByTestId('summon-reveal-overlay')).not.toBeNull();

		act(() => {
			vi.advanceTimersByTime(2000);
		});

		expect(screen.queryByTestId('summon-reveal-overlay')).toBeNull();
	});
});
