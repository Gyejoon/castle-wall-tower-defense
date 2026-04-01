import { beforeEach, describe, expect, it } from 'vitest';
import { useEmoteStore } from '../src/stores/emoteStore';

describe('emoteStore', () => {
	beforeEach(() => {
		useEmoteStore.setState({
			myEmote: null,
			opponentEmote: null,
			showEmotePanel: false,
		});
	});

	it('sendEmote sets myEmote and closes panel', () => {
		useEmoteStore.getState().toggleEmotePanel(); // open
		useEmoteStore.getState().sendEmote('gg');

		const state = useEmoteStore.getState();
		expect(state.myEmote?.id).toBe('gg');
		expect(state.showEmotePanel).toBe(false);
	});

	it('receiveEmote sets opponentEmote', () => {
		useEmoteStore.getState().receiveEmote('nice');
		expect(useEmoteStore.getState().opponentEmote?.id).toBe('nice');
	});

	it('toggleEmotePanel toggles showEmotePanel', () => {
		expect(useEmoteStore.getState().showEmotePanel).toBe(false);
		useEmoteStore.getState().toggleEmotePanel();
		expect(useEmoteStore.getState().showEmotePanel).toBe(true);
		useEmoteStore.getState().toggleEmotePanel();
		expect(useEmoteStore.getState().showEmotePanel).toBe(false);
	});

	it('clearMyEmote sets myEmote to null', () => {
		useEmoteStore.getState().sendEmote('lol');
		useEmoteStore.getState().clearMyEmote();
		expect(useEmoteStore.getState().myEmote).toBeNull();
	});

	it('clearOpponentEmote sets opponentEmote to null', () => {
		useEmoteStore.getState().receiveEmote('wow');
		useEmoteStore.getState().clearOpponentEmote();
		expect(useEmoteStore.getState().opponentEmote).toBeNull();
	});
});
