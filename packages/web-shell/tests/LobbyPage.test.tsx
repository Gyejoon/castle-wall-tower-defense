import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LobbyPage } from '../src/pages/LobbyPage';
import { useGameStore } from '../src/stores/gameStore';

vi.mock('@gld/phaser-game', () => ({
	EventBus: {
		emit: vi.fn(),
		on: vi.fn(),
		off: vi.fn(),
		removeAllListeners: vi.fn(),
	},
}));

describe('LobbyPage', () => {
	beforeEach(() => {
		useGameStore.setState(useGameStore.getInitialState());
	});

	afterEach(() => {
		cleanup();
	});

	it('renders the home tab as a Phase A start screen', () => {
		const view = render(<LobbyPage />);

		expect(view.getByText('Commander')).toBeTruthy();

		const tabs = view.getAllByRole('tab');
		expect(tabs).toHaveLength(3);
		// Center tab (마당/home) is index 1, should be selected by default
		expect(tabs[1]?.getAttribute('aria-selected')).toBe('true');

		// Phase A redesign ("Option C · cinematic keyart"):
		// hero title, PHASE A label, NEXT UP card copy, and 전투 시작 CTA.
		expect(view.getByText('Grid Line Defense')).toBeTruthy();
		expect(view.getByText('Phase A')).toBeTruthy();
		expect(view.getByText('NEXT UP')).toBeTruthy();
		expect(view.getByText('랜덤 합성 타워 디펜스')).toBeTruthy();
		expect(view.getByRole('button', { name: '전투 시작' })).toBeTruthy();
		expect(view.getByText('메타 강화 ›')).toBeTruthy();
		expect(view.queryByText('PVP 대전')).toBeNull();
	});

	it('switches tabs on click', () => {
		const view = render(<LobbyPage />);
		const tabs = view.getAllByRole('tab');
		// Tab order: [전쟁탁자, 마당, 설정]
		const collectionTab = tabs[0];
		const settingsTab = tabs[2];

		expect(collectionTab).toBeTruthy();
		expect(settingsTab).toBeTruthy();
		if (!(collectionTab && settingsTab)) {
			throw new Error('expected lobby tabs to render');
		}

		fireEvent.click(collectionTab);
		expect(useGameStore.getState().lobbyTab).toBe('collection');
		expect(collectionTab.getAttribute('aria-selected')).toBe('true');

		fireEvent.click(settingsTab);
		expect(useGameStore.getState().lobbyTab).toBe('settings');
	});

	it('starts a Phase A run on 전투 시작 click', () => {
		const view = render(<LobbyPage />);
		fireEvent.click(view.getByRole('button', { name: '전투 시작' }));

		expect(useGameStore.getState().runStatus).toBe('building');
	});

	it('enters MetaForge on 메타 강화 link click', () => {
		const view = render(<LobbyPage />);
		fireEvent.click(view.getByText('메타 강화 ›'));

		expect(useGameStore.getState().runStatus).toBe('metaForge');
	});

	it('shows collection tab with tower grid', () => {
		const view = render(<LobbyPage />);
		const tabs = view.getAllByRole('tab');
		const collectionTab = tabs[0]; // 전쟁탁자 is first

		expect(collectionTab).toBeTruthy();
		if (!collectionTab) {
			throw new Error('expected collection tab to render');
		}

		fireEvent.click(collectionTab);

		expect(view.getByText('보유 타워')).toBeTruthy();
		expect(view.getAllByText('궁수탑').length).toBeGreaterThanOrEqual(1);
	});

	it('shows settings tab with toggles', () => {
		const view = render(<LobbyPage />);
		const tabs = view.getAllByRole('tab');
		const settingsTab = tabs[2]; // 설정 is last

		expect(settingsTab).toBeTruthy();
		if (!settingsTab) {
			throw new Error('expected settings tab to render');
		}

		fireEvent.click(settingsTab);

		expect(view.getAllByText('설정').length).toBeGreaterThanOrEqual(1);
		expect(view.getByText('BGM')).toBeTruthy();
	});
});
