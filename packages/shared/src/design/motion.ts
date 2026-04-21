/**
 * Motion — duration + easing presets. CSS-only (no framer-motion yet).
 *
 * Keep keyframes in `global.css` but name/duration/easing pull from here.
 */

export const duration = {
	/** 120ms — hover/press feedback */
	fast: 120,
	/** 220ms — default UI transition (tab switch, sheet slide) */
	base: 220,
	/** 360ms — full overlay appear, card flip */
	slow: 360,
	/** 650ms — cinematic keyart, legend flip */
	cinematic: 650,
} as const;

export const easing = {
	/** default UI — smooth out */
	standard: 'cubic-bezier(0.2, 0.0, 0.2, 1)',
	/** energetic — overshoot feel */
	emphatic: 'cubic-bezier(0.32, 1.4, 0.4, 1)',
	/** decelerate — for appearing */
	decelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1.0)',
	/** step-wise — for pixel/retro feel */
	stepwise: 'steps(6, end)',
} as const;

export const motion = {
	duration,
	easing,
	/** common preset combinations */
	preset: {
		/** hover/press feedback */
		interactive: `${duration.fast}ms ${easing.standard}`,
		/** sheet slide, tab switch */
		ui: `${duration.base}ms ${easing.standard}`,
		/** overlay reveal */
		overlay: `${duration.slow}ms ${easing.decelerate}`,
		/** energetic punch (summon reveal) */
		punch: `${duration.slow}ms ${easing.emphatic}`,
		/** cinematic hero intro */
		cinematic: `${duration.cinematic}ms ${easing.decelerate}`,
	},
} as const;

export type DurationKey = keyof typeof duration;
export type EasingKey = keyof typeof easing;
