import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
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
  });

  it('introduces the random merge PvP loop and starts a run', () => {
    const view = render(<LobbyPage />);

    expect(view.getByText(/랜덤 타워 구매 \+ 합성으로 강화/i)).toBeTruthy();
    expect(view.getByText(/처치한 적이 상대에게 전송/i)).toBeTruthy();

    fireEvent.click(view.getByRole('button', { name: /게임 시작/i }));

    expect(useGameStore.getState().runStatus).toBe('building');
  });

  it('clears stale emotes before starting a new run', () => {
    useEmoteStore.getState().sendEmote('gg');
    useEmoteStore.getState().receiveEmote('angry');
    useEmoteStore.getState().toggleEmotePanel();

    const view = render(<LobbyPage />);
    fireEvent.click(view.getByRole('button', { name: /게임 시작/i }));

    expect(useEmoteStore.getState().myEmote).toBeNull();
    expect(useEmoteStore.getState().opponentEmote).toBeNull();
    expect(useEmoteStore.getState().showEmotePanel).toBe(false);
  });
});
