import { createDefaultSave } from '@gld/shared';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StageDetailPage } from '../src/pages/StageDetailPage';
import { useGameStore } from '../src/stores/gameStore';
import { useMetaStore } from '../src/stores/metaStore';

vi.mock('@gld/phaser-game', () => ({
	EventBus: {
		emit: vi.fn(),
		on: vi.fn(),
		off: vi.fn(),
		removeAllListeners: vi.fn(),
	},
	soundGenerator: {
		setMasterVolume: vi.fn(),
		unlock: vi.fn().mockResolvedValue(undefined),
	},
}));

describe('StageDetailPage', () => {
	beforeEach(() => {
		useMetaStore.setState(createDefaultSave());
		useGameStore.setState(useGameStore.getInitialState());
		useGameStore.setState({
			runStatus: 'stageDetail',
			selectedMapId: 'w1_forest_a',
			selectedStageId: 'w1_s2',
			selectedStar: 1,
		});
	});

	afterEach(() => {
		cleanup();
	});

	it('unlocks ★2 for the selected stage when that stage has a ★1 clear', () => {
		const save = createDefaultSave();
		save.progress.stageStars = { w1_s2: 1 };
		useMetaStore.setState(save);
		const view = render(<StageDetailPage />);

		const buttons = view.getAllByRole('button');
		const star2Button = buttons.find((button) =>
			button.textContent?.includes('정예'),
		);
		if (!star2Button) throw new Error('expected ★2 button');

		expect(star2Button.hasAttribute('disabled')).toBe(false);
		fireEvent.click(star2Button);
		expect(useGameStore.getState().selectedStar).toBe(2);
	});

	it('shows clear progress from selectedStageId highest wave, not selectedMapId', () => {
		const save = createDefaultSave();
		save.progress.highestWave = { w1_s2: 5 };
		useMetaStore.setState(save);
		const view = render(<StageDetailPage />);

		expect(view.getByText('★1 클리어 완료 — 2배속 플레이 가능')).toBeTruthy();
		expect(view.getByText('5/5')).toBeTruthy();
	});
});
