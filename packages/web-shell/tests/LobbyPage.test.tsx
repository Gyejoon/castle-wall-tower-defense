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

	it('renders the home tab as a 정식 모드 start screen', () => {
		const view = render(<LobbyPage />);

		expect(view.getByText('Commander')).toBeTruthy();

		const tabs = view.getAllByRole('tab');
		expect(tabs).toHaveLength(4);
		// Tab order: [전쟁탁자, 마당, 랭킹, 설정]; 마당(home) is index 1, default.
		expect(tabs[1]?.getAttribute('aria-selected')).toBe('true');

		// 정식 모드 redesign ("Option C · cinematic keyart"):
		// keyart carries the brand — no hero title. CTA card has NEXT UP
		// copy + 전투 시작 button. 메타 강화 lives in the 전쟁탁자 tab header.
		expect(view.queryByText('Grid Line Defense')).toBeNull();
		expect(view.getByText('NEXT UP')).toBeTruthy();
		expect(view.getByText('랜덤 합성 타워 디펜스')).toBeTruthy();
		expect(view.getByRole('button', { name: '전투 시작' })).toBeTruthy();
		expect(view.queryByText('메타 강화 ›')).toBeNull();
		expect(view.queryByText('PVP 대전')).toBeNull();
	});

	it('switches tabs on click', () => {
		const view = render(<LobbyPage />);
		const tabs = view.getAllByRole('tab');
		// Tab order: [전쟁탁자, 마당, 랭킹, 설정]
		const collectionTab = tabs[0];
		const leaderboardTab = tabs[2];
		const settingsTab = tabs[3];

		expect(collectionTab).toBeTruthy();
		expect(leaderboardTab).toBeTruthy();
		expect(settingsTab).toBeTruthy();
		if (!(collectionTab && leaderboardTab && settingsTab)) {
			throw new Error('expected lobby tabs to render');
		}

		fireEvent.click(collectionTab);
		expect(useGameStore.getState().lobbyTab).toBe('collection');
		expect(collectionTab.getAttribute('aria-selected')).toBe('true');

		fireEvent.click(leaderboardTab);
		expect(useGameStore.getState().lobbyTab).toBe('leaderboard');

		fireEvent.click(settingsTab);
		expect(useGameStore.getState().lobbyTab).toBe('settings');
	});

	it('starts a 정식 모드 run on 전투 시작 click', () => {
		const view = render(<LobbyPage />);
		fireEvent.click(view.getByRole('button', { name: '전투 시작' }));

		expect(useGameStore.getState().runStatus).toBe('building');
	});

	it('enters MetaForge from the 전쟁탁자 tab header button', () => {
		const view = render(<LobbyPage />);
		const tabs = view.getAllByRole('tab');
		const collectionTab = tabs[0]; // 전쟁탁자
		if (!collectionTab) throw new Error('expected collection tab');
		fireEvent.click(collectionTab);

		fireEvent.click(
			view.getByRole('button', { name: '메타 강화 페이지 열기' }),
		);

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
		const settingsTab = tabs[3]; // 설정 is last of [전쟁탁자, 마당, 랭킹, 설정]

		expect(settingsTab).toBeTruthy();
		if (!settingsTab) {
			throw new Error('expected settings tab to render');
		}

		fireEvent.click(settingsTab);

		expect(view.getAllByText('설정').length).toBeGreaterThanOrEqual(1);
		expect(view.getByText('BGM')).toBeTruthy();
	});
});
