// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Bun's runtime supplies a minimal localStorage without `.clear()`/`.setItem()`.
 * Install a Storage-like mock on both `globalThis` and `window` before the
 * store module is imported so Zustand's `persist` middleware captures a
 * working reference. See metaProgressStore.test.ts for background.
 */
const mockStorage = vi.hoisted(() => {
	const store = new Map<string, string>();
	const storage: Storage = {
		get length() {
			return store.size;
		},
		clear: () => store.clear(),
		getItem: (k) => store.get(k) ?? null,
		setItem: (k, v) => {
			store.set(k, String(v));
		},
		removeItem: (k) => {
			store.delete(k);
		},
		key: (i) => Array.from(store.keys())[i] ?? null,
	};
	const descriptor: PropertyDescriptor = {
		value: storage,
		configurable: true,
		writable: true,
	};
	Object.defineProperty(globalThis, 'localStorage', descriptor);
	if (typeof window !== 'undefined') {
		Object.defineProperty(window, 'localStorage', descriptor);
	}
	return { store };
});

vi.mock('@gld/phaser-game', () => ({
	EventBus: {
		emit: vi.fn(),
		on: vi.fn(),
		off: vi.fn(),
		removeAllListeners: vi.fn(),
	},
	soundGenerator: {
		setMasterVolume: vi.fn(),
	},
}));

const { MetaForgePage } = await import('../src/pages/MetaForgePage');
const { useGameStore } = await import('../src/stores/gameStore');
const { useMetaProgress, resetMetaProgress } = await import(
	'../src/stores/metaProgressStore'
);

describe('MetaForgePage', () => {
	beforeEach(() => {
		mockStorage.store.clear();
		resetMetaProgress();
		useGameStore.setState(useGameStore.getInitialState());
	});

	afterEach(() => {
		cleanup();
	});

	it('renders the "메타 강화" title', () => {
		const view = render(<MetaForgePage />);
		expect(view.getByText('메타 강화')).toBeTruthy();
	});

	it('shows +0% global attack by default', () => {
		const view = render(<MetaForgePage />);
		expect(view.getByText('+0%')).toBeTruthy();
	});

	it('renders the four base-family perk cards, each with 0 perks', () => {
		const view = render(<MetaForgePage />);
		// Korean family labels from the redesigned layout
		expect(view.getByText('궁수')).toBeTruthy();
		expect(view.getByText('공성')).toBeTruthy();
		expect(view.getByText('서리')).toBeTruthy();
		expect(view.getByText('성전')).toBeTruthy();
		// Each family card shows the count split into {number} + "퍽" label.
		// There are 4 family tiles, so we expect 4 "퍽" micro-labels.
		const perkLabels = view.getAllByText('퍽');
		expect(perkLabels).toHaveLength(4);
		// Every tile shows "0" count by default
		const zeros = view.getAllByText('0');
		expect(zeros.length).toBeGreaterThanOrEqual(4);
	});

	it('reflects addGlobalAtk updates on re-render (+30% after 0.3)', () => {
		const view = render(<MetaForgePage />);
		expect(view.getByText('+0%')).toBeTruthy();

		act(() => {
			useMetaProgress.getState().addGlobalAtk(0.3);
		});

		expect(view.getByText('+30%')).toBeTruthy();
	});
});
