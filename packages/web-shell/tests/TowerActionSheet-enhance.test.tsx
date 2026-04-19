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
	var __towerActionSheetEnhanceBusHarness__: EventBusHarness | undefined;
}

function getHarness(): EventBusHarness {
	if (!globalThis.__towerActionSheetEnhanceBusHarness__) {
		throw new Error('TowerActionSheet-enhance bus harness not initialized');
	}
	return globalThis.__towerActionSheetEnhanceBusHarness__;
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
	globalThis.__towerActionSheetEnhanceBusHarness__ = {
		listeners,
		emitSpy,
		offSpy,
	};
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

import { inBattleEnhanceCost, MAX_IN_BATTLE_LEVEL } from '@gld/shared';
import { useGameStore } from '../src/stores/gameStore';

let TowerActionSheet: typeof import('../src/components/game/TowerActionSheet').TowerActionSheet;

const sample = {
	instanceId: '3,4',
	col: 3,
	row: 4,
	towerId: 'archer',
	towerName: '궁수',
	tier: 2,
	sellValue: 10,
	level: 1,
};

function setGold(gold: number) {
	act(() => {
		useGameStore.getState().setGold(gold);
	});
}

describe('TowerActionSheet — in-battle enhance button', () => {
	beforeAll(async () => {
		({ TowerActionSheet } = await import(
			'../src/components/game/TowerActionSheet'
		));
	});

	beforeEach(() => {
		const { listeners, emitSpy, offSpy } = getHarness();
		listeners.clear();
		emitSpy.mockClear();
		offSpy.mockClear();
		setGold(99_999);
	});

	afterEach(() => {
		const { listeners, emitSpy, offSpy } = getHarness();
		listeners.clear();
		emitSpy.mockClear();
		offSpy.mockClear();
	});

	it('renders the enhance button alongside the existing 4 actions (5 total)', () => {
		render(<TowerActionSheet selectedTower={sample} onDeselect={() => {}} />);
		expect(screen.getByTestId('tower-action-merge')).toBeDefined();
		expect(screen.getByTestId('tower-action-move')).toBeDefined();
		expect(screen.getByTestId('tower-action-sell')).toBeDefined();
		expect(screen.getByTestId('tower-action-enhance')).toBeDefined();
		expect(screen.getByTestId('tower-action-close')).toBeDefined();
	});

	it('enhance button shows next-level label and cost badge', () => {
		render(<TowerActionSheet selectedTower={sample} onDeselect={() => {}} />);
		const btn = screen.getByTestId('tower-action-enhance');
		// Level 1 → Lv2 next, cost = inBattleEnhanceCost(1)
		expect(btn.textContent).toContain('강화 Lv2');
		expect(btn.textContent).toContain(`💰${inBattleEnhanceCost(1)}`);
	});

	it('clicking the enhance button emits request-enhance-tower with the grid coords', () => {
		render(<TowerActionSheet selectedTower={sample} onDeselect={() => {}} />);
		act(() => {
			(screen.getByTestId('tower-action-enhance') as HTMLButtonElement).click();
		});
		const { emitSpy } = getHarness();
		const calls = emitSpy.mock.calls.filter(
			([evt]) => evt === 'request-enhance-tower',
		);
		expect(calls.length).toBe(1);
		expect(calls[0][1]).toEqual({ col: 3, row: 4 });
	});

	it('disables the enhance button at MAX_IN_BATTLE_LEVEL and shows MAX label', () => {
		render(
			<TowerActionSheet
				selectedTower={{ ...sample, level: MAX_IN_BATTLE_LEVEL }}
				onDeselect={() => {}}
			/>,
		);
		const btn = screen.getByTestId('tower-action-enhance') as HTMLButtonElement;
		expect(btn.disabled).toBe(true);
		expect(btn.dataset.atMax).toBe('1');
		expect(btn.textContent).toContain('MAX');

		// Clicking a disabled max-level button must not emit the request.
		act(() => {
			btn.click();
		});
		const { emitSpy } = getHarness();
		const calls = emitSpy.mock.calls.filter(
			([evt]) => evt === 'request-enhance-tower',
		);
		expect(calls.length).toBe(0);
	});

	it('disables the enhance button when gold is below the cost', () => {
		// L1 → L2 cost is 50; set gold < 50.
		setGold(10);
		render(<TowerActionSheet selectedTower={sample} onDeselect={() => {}} />);
		const btn = screen.getByTestId('tower-action-enhance') as HTMLButtonElement;
		expect(btn.disabled).toBe(true);
		expect(btn.dataset.disabled).toBe('1');
	});
});
