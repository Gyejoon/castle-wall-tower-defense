export const duration = {
	fast: 120,
	base: 220,
	slow: 360,
	cinematic: 650,
} as const;

export const easing = {
	standard: 'cubic-bezier(0.2, 0.0, 0.2, 1)',
	emphatic: 'cubic-bezier(0.32, 1.4, 0.4, 1)',
	decelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1.0)',
	stepwise: 'steps(6, end)',
} as const;

export const motion = {
	duration,
	easing,
	preset: {
		interactive: `${duration.fast}ms ${easing.standard}`,
		ui: `${duration.base}ms ${easing.standard}`,
		overlay: `${duration.slow}ms ${easing.decelerate}`,
		punch: `${duration.slow}ms ${easing.emphatic}`,
		cinematic: `${duration.cinematic}ms ${easing.decelerate}`,
	},
} as const;

export type DurationKey = keyof typeof duration;
export type EasingKey = keyof typeof easing;
