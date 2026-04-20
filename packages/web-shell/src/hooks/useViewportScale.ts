import { useLayoutEffect, useState } from 'react';

/**
 * Phase A [B4] — device-independent viewport scale.
 *
 * The game canvas and HUD are rendered at a fixed 432×960 logical size
 * inside `#game-container`. This hook computes the uniform `scale(s)` we
 * apply to that wrapper so the entire fixed-size layout fits the current
 * viewport while preserving tower:monster ratios on every device.
 *
 * We keep the base size as arguments (rather than importing it from
 * shared) so the hook stays trivially reusable if we ever need a
 * different base for a menu/full-screen mode.
 */
export function useViewportScale(baseWidth = 432, baseHeight = 960): number {
	const [scale, setScale] = useState(1);

	useLayoutEffect(() => {
		const calc = () => {
			const ww = window.innerWidth || baseWidth;
			const wh = window.innerHeight || baseHeight;
			setScale(Math.min(ww / baseWidth, wh / baseHeight));
		};
		calc();
		window.addEventListener('resize', calc);
		window.addEventListener('orientationchange', calc);
		return () => {
			window.removeEventListener('resize', calc);
			window.removeEventListener('orientationchange', calc);
		};
	}, [baseWidth, baseHeight]);

	return scale;
}
