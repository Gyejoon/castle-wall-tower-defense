/**
 * Border-radius scale — pixel-art friendly (0~12px + pill).
 *
 * Pixel art prefers sharp corners. Reserve `md`+ for DOM overlays and soft CTAs.
 */

export const radius = {
	/** sharp pixel corner */
	none: 0,
	/** 2px — barely-there softening on inner panels */
	xs: 2,
	/** 4px — default card corner */
	sm: 4,
	/** 6px — button */
	md: 6,
	/** 8px — large card, overlay panel */
	lg: 8,
	/** 12px — hero card corner */
	xl: 12,
	/** 9999px — pill badges */
	pill: 9999,
} as const;

export type RadiusKey = keyof typeof radius;
