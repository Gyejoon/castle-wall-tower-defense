import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LobbyPage } from '../src/pages/LobbyPage';
import { useGameStore } from '../src/stores/gameStore';

describe('LobbyPage', () => {
	beforeEach(() => {
		useGameStore.setState(useGameStore.getInitialState());
	});

	afterEach(() => {
		cleanup();
	});

	it('renders the home tab as a single-player PVE start screen', () => {
		const view = render(<LobbyPage />);

		expect(view.getByText('Commander')).toBeTruthy();

		const tabs = view.getAllByRole('tab');
		expect(tabs).toHaveLength(3);
		expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');

		expect(view.getByText('PVE 생존')).toBeTruthy();
		expect(view.getByText('게임 시작')).toBeTruthy();
		expect(view.queryByText('PVP 대전')).toBeNull();
		expect(view.queryByText('상대를 찾는 중...')).toBeNull();
	});

	it('switches tabs on click', () => {
		const view = render(<LobbyPage />);
		const tabs = view.getAllByRole('tab');
		const collectionTab = tabs[1];
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

	it('starts the run immediately', () => {
		const view = render(<LobbyPage />);
		fireEvent.click(view.getByText('게임 시작'));

		expect(useGameStore.getState().runStatus).toBe('building');
	});

	it('shows collection tab with tower grid', () => {
		const view = render(<LobbyPage />);
		const tabs = view.getAllByRole('tab');
		const collectionTab = tabs[1];

		expect(collectionTab).toBeTruthy();
		if (!collectionTab) {
			throw new Error('expected collection tab to render');
		}

		fireEvent.click(collectionTab);

		expect(view.getByText('보유 타워')).toBeTruthy();
		expect(view.getByText('궁수 탑')).toBeTruthy();
	});

	it('shows settings tab with toggles', () => {
		const view = render(<LobbyPage />);
		const tabs = view.getAllByRole('tab');
		const settingsTab = tabs[2];

		expect(settingsTab).toBeTruthy();
		if (!settingsTab) {
			throw new Error('expected settings tab to render');
		}

		fireEvent.click(settingsTab);

		expect(view.getByText('설정')).toBeTruthy();
		expect(view.getByText('효과음')).toBeTruthy();
	});
});
