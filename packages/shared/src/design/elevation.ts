/**
 * Elevation — pixel-art style hard drop shadows (no blur), 4 levels.
 *
 * Each level is a solid offset block-shadow. Matches PixelButton/PixelPanel aesthetic.
 * Overlay alpha conventions live here too (for dimming under modals/sheets).
 */

export const elevation = {
	/** flat — no depth */
	0: 'none',
	/** 1 — hud chip, tag */
	1: '0 2px 0 rgba(10, 8, 4, 0.55)',
	/** 2 — button resting, card */
	2: '0 3px 0 #7a5a10',
	/** 3 — raised panel, floating sheet */
	3: '0 4px 0 rgba(10, 8, 4, 0.65), 0 1px 0 rgba(255, 255, 255, 0.04) inset',
	/** 4 — modal, overlay frame */
	4: '0 6px 0 rgba(10, 8, 4, 0.75), 0 2px 0 rgba(255, 255, 255, 0.06) inset',
} as const;

export const overlayDim = {
	/** subtle darken, for bottom sheets that don't fully occlude */
	soft: 'rgba(0, 0, 0, 0.35)',
	/** default modal backdrop */
	default: 'rgba(0, 0, 0, 0.6)',
	/** heavy — full pause/defeat screen dim */
	heavy: 'rgba(10, 8, 4, 0.82)',
	/** max — cinematic reveal */
	cinematic: 'rgba(10, 8, 4, 0.92)',
} as const;

export type ElevationKey = keyof typeof elevation;
export type OverlayDimKey = keyof typeof overlayDim;
