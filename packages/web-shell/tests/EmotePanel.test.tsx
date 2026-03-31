import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { EmotePanel } from '../src/components/EmotePanel';
import { useEmoteStore } from '../src/stores/emoteStore';

describe('EmotePanel', () => {
	beforeEach(() => {
		useEmoteStore.setState({
			myEmote: null,
			opponentEmote: null,
			showEmotePanel: false,
		});
	});

	it('opens the emote panel and sends an emote', () => {
		const view = render(<EmotePanel />);

		fireEvent.click(view.getByRole('button', { name: /open emotes/i }));
		fireEvent.click(view.getByTestId('emote-gg'));

		expect(useEmoteStore.getState().myEmote?.id).toBe('gg');
		expect(useEmoteStore.getState().showEmotePanel).toBe(false);
	});
});
