import { fireEvent, render } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEmoteStore } from '../src/stores/emoteStore';
import { useGameStore } from '../src/stores/gameStore';

vi.mock('../src/game/PhaserGame', () => ({
	PhaserGame: () => <div data-testid="phaser-game" />,
}));

vi.mock('@gld/phaser-game', () => ({
	EventBus: {
		emit: vi.fn(),
		on: vi.fn(),
		off: vi.fn(),
	},
}));

let GamePage: typeof import('../src/pages/GamePage').GamePage;

describe('GamePage regression', () => {
	beforeAll(async () => {
		({ GamePage } = await import('../src/pages/GamePage'));
	});

	beforeEach(() => {
		useGameStore.setState(useGameStore.getInitialState());
		useGameStore.getState().resetRun();
		useEmoteStore.setState({
			myEmote: null,
			opponentEmote: null,
			showEmotePanel: false,
		});
	});

	it('Regression: ISSUE-001 — 전투 중 나가기 전에 확인을 요구한다', () => {
		// Regression: ISSUE-001 — 전투 중 나가기 전에 확인 없이 로비로 이동하던 문제
		// Found by /qa on 2026-04-02
		// Report: .gstack/qa-reports/qa-report-localhost-3101-2026-04-02.md
		const confirmSpy = vi
			.spyOn(window, 'confirm')
			.mockReturnValueOnce(false)
			.mockReturnValueOnce(true);
		const view = render(<GamePage />);

		fireEvent.click(view.getByRole('button', { name: '나가기' }));
		expect(confirmSpy).toHaveBeenCalledTimes(1);
		expect(useGameStore.getState().runStatus).not.toBe('lobby');

		fireEvent.click(view.getByRole('button', { name: '나가기' }));
		expect(confirmSpy).toHaveBeenCalledTimes(2);
		expect(useGameStore.getState().runStatus).toBe('lobby');
	});

	it('Regression: ISSUE-002 — 하단 패널이 남는 높이를 모두 먹지 않는다', () => {
		const view = render(<GamePage />);
		const panel = view.getByTestId('bottom-panel') as HTMLDivElement;

		// Regression: ISSUE-002 — tall 화면에서 하단 패널이 flex: 1 + space-between 으로
		// 남는 높이를 전부 차지해 큰 죽은 공간을 만들던 문제
		// Found by /qa on 2026-04-02
		expect(panel.style.flex).toBe('0 0 auto');
		expect(panel.style.justifyContent).toBe('flex-start');
	});
});
