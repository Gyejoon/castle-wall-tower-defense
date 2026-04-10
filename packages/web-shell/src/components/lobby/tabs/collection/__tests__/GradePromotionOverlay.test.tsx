import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GradePromotionOverlay } from '../GradePromotionOverlay';

describe('GradePromotionOverlay', () => {
	it('calls onDone after full animation sequence', () => {
		vi.useFakeTimers();
		const onDone = vi.fn();
		render(
			<GradePromotionOverlay
				fromGrade="normal"
				toGrade="rare"
				towerId="archer"
				onDone={onDone}
			/>,
		);
		act(() => {
			vi.advanceTimersByTime(1400);
		});
		expect(onDone).toHaveBeenCalled();
		vi.useRealTimers();
	});

	it('renders new grade sprite src', () => {
		render(
			<GradePromotionOverlay
				fromGrade="normal"
				toGrade="rare"
				towerId="archer"
				onDone={() => {}}
			/>,
		);
		const img = document.querySelector('img')!;
		expect(img.getAttribute('src')).toBe('/assets/towers/archer-rare.png');
	});

	it('uses base sprite for normal grade', () => {
		render(
			<GradePromotionOverlay
				fromGrade="normal"
				toGrade="normal"
				towerId="archer"
				onDone={() => {}}
			/>,
		);
		const img = document.querySelector('img')!;
		expect(img.getAttribute('src')).toBe('/assets/towers/archer.png');
	});
});
