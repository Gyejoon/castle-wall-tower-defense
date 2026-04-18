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
	var __towerActionSheetBusHarness__: EventBusHarness | undefined;
}

function getHarness(): EventBusHarness {
	if (!globalThis.__towerActionSheetBusHarness__) {
		throw new Error('TowerActionSheet test bus harness not initialized');
	}
	return globalThis.__towerActionSheetBusHarness__;
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
	globalThis.__towerActionSheetBusHarness__ = { listeners, emitSpy, offSpy };
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

let TowerActionSheet: typeof import('../src/components/game/TowerActionSheet').TowerActionSheet;

const sample = {
	instanceId: '3,4',
	col: 3,
	row: 4,
	towerId: 'archer',
	towerName: '궁수',
	tier: 2,
	sellValue: 10,
};

describe('TowerActionSheet', () => {
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
	});

	afterEach(() => {
		const { listeners, emitSpy, offSpy } = getHarness();
		listeners.clear();
		emitSpy.mockClear();
		offSpy.mockClear();
	});

	it('renders nothing when selectedTower is null', () => {
		const { container } = render(
			<TowerActionSheet selectedTower={null} onDeselect={() => {}} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it('renders four action buttons when a tower is selected', () => {
		render(<TowerActionSheet selectedTower={sample} onDeselect={() => {}} />);
		expect(screen.getByTestId('tower-action-merge')).toBeDefined();
		expect(screen.getByTestId('tower-action-move')).toBeDefined();
		expect(screen.getByTestId('tower-action-sell')).toBeDefined();
		expect(screen.getByTestId('tower-action-close')).toBeDefined();
	});

	it('renders tower tier + name + sell value', () => {
		render(<TowerActionSheet selectedTower={sample} onDeselect={() => {}} />);
		expect(screen.getByTestId('tower-action-sheet-tier').textContent).toBe(
			'T2',
		);
		expect(screen.getByText('궁수')).toBeDefined();
		expect(screen.getByText('판매 +10')).toBeDefined();
	});

	it('clicking 합성 emits enter-merge-mode with the instanceId', () => {
		render(<TowerActionSheet selectedTower={sample} onDeselect={() => {}} />);
		act(() => {
			(screen.getByTestId('tower-action-merge') as HTMLButtonElement).click();
		});
		const { emitSpy } = getHarness();
		const calls = emitSpy.mock.calls.filter(
			([evt]) => evt === 'enter-merge-mode',
		);
		expect(calls.length).toBe(1);
		expect(calls[0][1]).toEqual({ sourceId: '3,4' });
	});

	it('clicking 판매 emits request-sell-tower with the grid coords', () => {
		render(<TowerActionSheet selectedTower={sample} onDeselect={() => {}} />);
		act(() => {
			(screen.getByTestId('tower-action-sell') as HTMLButtonElement).click();
		});
		const { emitSpy } = getHarness();
		const calls = emitSpy.mock.calls.filter(
			([evt]) => evt === 'request-sell-tower',
		);
		expect(calls.length).toBe(1);
		expect(calls[0][1]).toEqual({ col: 3, row: 4 });
	});

	it('clicking 이동 emits request-enter-move-mode', () => {
		render(<TowerActionSheet selectedTower={sample} onDeselect={() => {}} />);
		act(() => {
			(screen.getByTestId('tower-action-move') as HTMLButtonElement).click();
		});
		const { emitSpy } = getHarness();
		const calls = emitSpy.mock.calls.filter(
			([evt]) => evt === 'request-enter-move-mode',
		);
		expect(calls.length).toBe(1);
		expect(calls[0][1]).toEqual({ fromCol: 3, fromRow: 4 });
	});

	it('clicking ✕ calls onDeselect', () => {
		const onDeselect = vi.fn();
		render(<TowerActionSheet selectedTower={sample} onDeselect={onDeselect} />);
		act(() => {
			(screen.getByTestId('tower-action-close') as HTMLButtonElement).click();
		});
		expect(onDeselect).toHaveBeenCalledTimes(1);
	});

	it('[F21] resets internal mode when selected tower changes', () => {
		const { rerender } = render(
			<TowerActionSheet selectedTower={sample} onDeselect={() => {}} />,
		);
		// Put the sheet into merge-source mode.
		act(() => {
			(screen.getByTestId('tower-action-merge') as HTMLButtonElement).click();
		});

		// Switch to a different tower — mode should reset, visual affordance
		// (border color) no longer indicates merge-source. We verify by
		// re-clicking merge and confirming it emits enter-merge-mode fresh
		// (rather than being a no-op from sticky state).
		const other = { ...sample, instanceId: '5,5', col: 5, row: 5 };
		rerender(<TowerActionSheet selectedTower={other} onDeselect={() => {}} />);

		const { emitSpy } = getHarness();
		emitSpy.mockClear();
		act(() => {
			(screen.getByTestId('tower-action-merge') as HTMLButtonElement).click();
		});
		const calls = emitSpy.mock.calls.filter(
			([evt]) => evt === 'enter-merge-mode',
		);
		expect(calls[0][1]).toEqual({ sourceId: '5,5' });
	});
});
