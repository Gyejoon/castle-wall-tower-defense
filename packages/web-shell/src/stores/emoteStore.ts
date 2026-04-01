import { create } from 'zustand';

interface EmoteState {
	myEmote: { id: string; timestamp: number } | null;
	opponentEmote: { id: string; timestamp: number } | null;
	showEmotePanel: boolean;
	sendEmote: (emoteId: string) => void;
	receiveEmote: (emoteId: string) => void;
	toggleEmotePanel: () => void;
	clearMyEmote: () => void;
	clearOpponentEmote: () => void;
	reset: () => void;
}

export const useEmoteStore = create<EmoteState>()((set) => ({
	myEmote: null,
	opponentEmote: null,
	showEmotePanel: false,

	sendEmote: (emoteId) =>
		set({
			myEmote: { id: emoteId, timestamp: Date.now() },
			showEmotePanel: false,
		}),

	receiveEmote: (emoteId) =>
		set({
			opponentEmote: { id: emoteId, timestamp: Date.now() },
		}),

	toggleEmotePanel: () =>
		set((state) => ({ showEmotePanel: !state.showEmotePanel })),

	clearMyEmote: () => set({ myEmote: null }),
	clearOpponentEmote: () => set({ opponentEmote: null }),
	reset: () =>
		set({
			myEmote: null,
			opponentEmote: null,
			showEmotePanel: false,
		}),
}));
