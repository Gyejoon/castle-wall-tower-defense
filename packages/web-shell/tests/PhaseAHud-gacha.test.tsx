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
import { useGameStore } from '../src/stores/gameStore';

type EventHandler = (payload?: unknown) => void;

type EventBusHarness = {
	listeners: Map<string, Set<EventHandler>>;
	emitSpy: ReturnType<typeof vi.fn>;
	offSpy: ReturnType<typeof vi.fn>;
};

declare global {
	// eslint-disable-next-line no-var
	var __phaseAHudBusHarness__: EventBusHarness | undefined;
}

function getHarness(): EventBusHarness {
	if (!globalThis.__phaseAHudBusHarness__) {
		throw new Error('PhaseAHud test bus harness not initialized');
	}
	return globalThis.__phaseAHudBusHarness__;
}

// jsdom + React Testing Library bootstrap — mirrors GamePage.test.tsx.
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
	globalThis.__phaseAHudBusHarness__ = { listeners, emitSpy, offSpy };
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
		soundGenerator: {
			setMasterVolume: vi.fn(),
			unlock: vi.fn().mockResolvedValue(undefined),
		},
	};
});

let PhaseAHud: typeof import('../src/components/game/PhaseAHud').PhaseAHud;

describe('PhaseAHud gacha buttons', () => {
	beforeAll(async () => {
		({ PhaseAHud } = await import('../src/components/game/PhaseAHud'));
	});

	beforeEach(() => {
		const { listeners, emitSpy, offSpy } = getHarness();
		listeners.clear();
		emitSpy.mockClear();
		offSpy.mockClear();
	});

	afterEach(() => {
		const { listeners, emitSpy, offSpy } = getHarness();
		listeners.clear();
		emitSpy.mockClear();
		offSpy.mockClear();
	});

	it('renders three gacha buttons (T2 / T3 / T4)', () => {
		act(() => {
			useGameStore.setState({ energy: 200 });
		});

		render(<PhaseAHud />);

		expect(screen.getByTestId('phase-a-gacha-t2')).toBeDefined();
		expect(screen.getByTestId('phase-a-gacha-t3')).toBeDefined();
		expect(screen.getByTestId('phase-a-gacha-t4')).toBeDefined();
	});

	it('clicking T2 gacha button emits request-gacha-summon with targetTier 2', () => {
		act(() => {
			useGameStore.setState({ energy: 200 });
		});

		render(<PhaseAHud />);

		const btn = screen.getByTestId('phase-a-gacha-t2') as HTMLButtonElement;
		act(() => {
			btn.click();
		});

		const { emitSpy } = getHarness();
		const gachaCalls = emitSpy.mock.calls.filter(
			([evt]) => evt === 'request-gacha-summon',
		);
		expect(gachaCalls.length).toBe(1);
		expect(gachaCalls[0][1]).toEqual({ targetTier: 2 });
	});

	it('disables gacha buttons when energy is below cost', () => {
		act(() => {
			useGameStore.setState({ energy: 30 });
		});

		render(<PhaseAHud />);

		const t2 = screen.getByTestId('phase-a-gacha-t2') as HTMLButtonElement;
		const t3 = screen.getByTestId('phase-a-gacha-t3') as HTMLButtonElement;
		const t4 = screen.getByTestId('phase-a-gacha-t4') as HTMLButtonElement;

		// Cost table: T2 = 40, T3 = 80, T4 = 160. Energy 30 disables all.
		expect(t2.disabled).toBe(true);
		expect(t3.disabled).toBe(true);
		expect(t4.disabled).toBe(true);
	});
});
