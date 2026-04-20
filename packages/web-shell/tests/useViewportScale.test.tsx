import { act, render, screen } from '@testing-library/react';
import { JSDOM } from 'jsdom';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { useViewportScale } from '../src/hooks/useViewportScale';

beforeAll(() => {
	if (typeof document === 'undefined') {
		const dom = new JSDOM('<!doctype html><html><body></body></html>');
		globalThis.window = dom.window as unknown as Window & typeof globalThis;
		globalThis.document = dom.window.document;
		globalThis.navigator = dom.window.navigator;
		globalThis.HTMLElement = dom.window.HTMLElement;
		globalThis.Node = dom.window.Node;
		globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
		globalThis.IS_REACT_ACT_ENVIRONMENT = true;
	}
});

function setViewport(width: number, height: number): void {
	Object.defineProperty(window, 'innerWidth', {
		configurable: true,
		writable: true,
		value: width,
	});
	Object.defineProperty(window, 'innerHeight', {
		configurable: true,
		writable: true,
		value: height,
	});
}

function Harness() {
	const scale = useViewportScale(432, 960);
	return (
		<div data-testid="wrapper" style={{ transform: `scale(${scale})` }}>
			<span data-testid="scale">{scale.toFixed(6)}</span>
		</div>
	);
}

describe('useViewportScale', () => {
	afterEach(() => {
		setViewport(1024, 768);
	});

	it('returns min(ww/432, wh/960) on mount (iPhone SE portrait: width is the bottleneck)', () => {
		setViewport(375, 667);
		render(<Harness />);
		const expected = Math.min(375 / 432, 667 / 960);
		const actual = Number(screen.getByTestId('scale').textContent);
		expect(actual).toBeCloseTo(expected, 5);
	});

	it('returns min(ww/432, wh/960) on tall phone (iPhone 14 Pro Max: height-bounded depending on aspect)', () => {
		setViewport(430, 932);
		render(<Harness />);
		const expected = Math.min(430 / 432, 932 / 960);
		const actual = Number(screen.getByTestId('scale').textContent);
		expect(actual).toBeCloseTo(expected, 5);
	});

	it('updates on window resize', () => {
		setViewport(432, 960);
		render(<Harness />);
		expect(Number(screen.getByTestId('scale').textContent)).toBeCloseTo(1, 5);

		act(() => {
			setViewport(216, 480);
			window.dispatchEvent(new Event('resize'));
		});
		expect(Number(screen.getByTestId('scale').textContent)).toBeCloseTo(0.5, 5);
	});

	it('never exceeds the smaller-dimension ratio (wrapper stays inside viewport)', () => {
		setViewport(800, 600);
		render(<Harness />);
		const scale = Number(screen.getByTestId('scale').textContent);
		// width ratio 800/432 ≈ 1.85, height ratio 600/960 = 0.625 → min = 0.625
		expect(scale).toBeCloseTo(600 / 960, 5);
		// Wrapper inside viewport: 432 * scale ≤ 800 AND 960 * scale ≤ 600
		expect(432 * scale).toBeLessThanOrEqual(800);
		expect(960 * scale).toBeLessThanOrEqual(600 + 0.001);
	});
});
