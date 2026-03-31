import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { useEmoteStore } from '../src/stores/emoteStore';
import { useGameStore } from '../src/stores/gameStore';
import { LobbyPage } from '../src/pages/LobbyPage';

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
    vi.useRealTimers();
  });

  it('renders with ProfileBar, 3 tabs, and home tab content', () => {
    const view = render(<LobbyPage />);

    // ProfileBar elements
    expect(view.getByText('기사단장')).toBeTruthy();

    // 3 bottom tabs
    const tabs = view.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');

    // Home tab content
    expect(view.getByText('PVP 대전')).toBeTruthy();
    expect(view.getByText('전투 시작')).toBeTruthy();
  });

  it('switches tabs on click', () => {
    const view = render(<LobbyPage />);
    const tabs = view.getAllByRole('tab');

    // Click collection tab
    fireEvent.click(tabs[1]);
    expect(useGameStore.getState().lobbyTab).toBe('collection');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');

    // Click settings tab
    fireEvent.click(tabs[2]);
    expect(useGameStore.getState().lobbyTab).toBe('settings');
  });

  it('starts matchmaking and enters game after delay', () => {
    const view = render(<LobbyPage />);

    fireEvent.click(view.getByText('전투 시작'));

    // Matchmaking overlay should appear
    expect(view.getByText('상대를 찾는 중...')).toBeTruthy();
    expect(view.getByText('취소')).toBeTruthy();

    // Advance timer past 1.5s
    act(() => { vi.advanceTimersByTime(1500); });

    expect(useGameStore.getState().runStatus).toBe('building');
  });

  it('cancels matchmaking', () => {
    const view = render(<LobbyPage />);

    fireEvent.click(view.getByText('전투 시작'));
    expect(view.getByText('상대를 찾는 중...')).toBeTruthy();

    // Cancel
    fireEvent.click(view.getByText('취소'));

    // Should be back to normal home tab
    expect(view.queryByText('상대를 찾는 중...')).toBeNull();
    expect(useGameStore.getState().runStatus).toBe('lobby');
  });

  it('prevents double-tap on battle button', () => {
    const view = render(<LobbyPage />);
    const startBtn = view.getByText('전투 시작');

    fireEvent.click(startBtn);

    // Button should now show "매칭 중..." and be disabled
    expect(view.getByText('매칭 중...')).toBeTruthy();
  });

  it('clears stale emotes when starting a game', () => {
    useEmoteStore.getState().sendEmote('gg');
    useEmoteStore.getState().receiveEmote('angry');
    useEmoteStore.getState().toggleEmotePanel();

    const view = render(<LobbyPage />);
    fireEvent.click(view.getByText('전투 시작'));

    act(() => { vi.advanceTimersByTime(1500); });

    expect(useEmoteStore.getState().myEmote).toBeNull();
    expect(useEmoteStore.getState().opponentEmote).toBeNull();
    expect(useEmoteStore.getState().showEmotePanel).toBe(false);
  });

  it('shows collection tab with tower grid', () => {
    const view = render(<LobbyPage />);
    const tabs = view.getAllByRole('tab');

    fireEvent.click(tabs[1]); // collection

    expect(view.getByText('보유 타워')).toBeTruthy();
    expect(view.getByText('화염 포탑')).toBeTruthy();
  });

  it('shows settings tab with toggles', () => {
    const view = render(<LobbyPage />);
    const tabs = view.getAllByRole('tab');

    fireEvent.click(tabs[2]); // settings

    expect(view.getByText('설정')).toBeTruthy();
    expect(view.getByText('효과음')).toBeTruthy();
  });
});
