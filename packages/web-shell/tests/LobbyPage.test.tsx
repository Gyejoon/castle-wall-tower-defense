import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LobbyPage } from '../src/pages/LobbyPage';
import { useEmoteStore } from '../src/stores/emoteStore';
import { useGameStore } from '../src/stores/gameStore';

describe('LobbyPage', () => {
	beforeEach(() => {
		useGameStore.setState(useGameStore.getInitialState());
		useEmoteStore.setState({
			myEmote: null,
			opponentEmote: null,
			showEmotePanel: false,
		});
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it('renders with ProfileBar, 3 tabs, and home tab content', () => {
		const view = render(<LobbyPage />);

		expect(view.getByText('기사단장')).toBeTruthy();

		const tabs = view.getAllByRole('tab');
		expect(tabs).toHaveLength(3);
		expect(tabs[0]?.getAttribute('aria-selected')).toBe('true');

		expect(view.getByText('PVP 대전')).toBeTruthy();
		expect(view.getByText('전투 시작')).toBeTruthy();
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

	it('starts matchmaking and enters game after delay', () => {
		const view = render(<LobbyPage />);

		fireEvent.click(view.getByText('전투 시작'));

		expect(view.getByText('상대를 찾는 중...')).toBeTruthy();
		expect(view.getByText('취소')).toBeTruthy();

		act(() => {
			vi.advanceTimersByTime(1500);
		});

		expect(useGameStore.getState().runStatus).toBe('building');
	});

	it('cancels matchmaking', () => {
		const view = render(<LobbyPage />);

		fireEvent.click(view.getByText('전투 시작'));
		expect(view.getByText('상대를 찾는 중...')).toBeTruthy();

		fireEvent.click(view.getByText('취소'));

		expect(view.queryByText('상대를 찾는 중...')).toBeNull();
		expect(useGameStore.getState().runStatus).toBe('lobby');
	});

	it('prevents double-tap on battle button', () => {
		const view = render(<LobbyPage />);
		const startButton = view.getByText('전투 시작');

		fireEvent.click(startButton);

		const matchingButton = view.getByText('매칭 중...');
		expect(matchingButton).toBeTruthy();

		fireEvent.click(matchingButton);
		expect(useGameStore.getState().runStatus).toBe('lobby');

		act(() => {
			vi.advanceTimersByTime(1500);
		});

		expect(useGameStore.getState().runStatus).toBe('building');
	});

	it('clears stale emotes when starting a game', () => {
		useEmoteStore.getState().sendEmote('gg');
		useEmoteStore.getState().receiveEmote('angry');
		useEmoteStore.getState().toggleEmotePanel();

		const view = render(<LobbyPage />);
		fireEvent.click(view.getByText('전투 시작'));

		act(() => {
			vi.advanceTimersByTime(1500);
		});

		expect(useEmoteStore.getState().myEmote).toBeNull();
		expect(useEmoteStore.getState().opponentEmote).toBeNull();
		expect(useEmoteStore.getState().showEmotePanel).toBe(false);
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
		expect(view.getByText('화염 포탑')).toBeTruthy();
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
