// 픽셀아트용 하드 드롭섀도 4단계. blur 없음.
export const elevation = {
	0: 'none',
	1: '0 2px 0 rgba(10, 8, 4, 0.55)',
	2: '0 3px 0 #7a5a10',
	3: '0 4px 0 rgba(10, 8, 4, 0.65), 0 1px 0 rgba(255, 255, 255, 0.04) inset',
	4: '0 6px 0 rgba(10, 8, 4, 0.75), 0 2px 0 rgba(255, 255, 255, 0.06) inset',
} as const;

export const overlayDim = {
	soft: 'rgba(0, 0, 0, 0.35)',
	default: 'rgba(0, 0, 0, 0.6)',
	heavy: 'rgba(10, 8, 4, 0.82)',
	cinematic: 'rgba(10, 8, 4, 0.92)',
} as const;

export type ElevationKey = keyof typeof elevation;
export type OverlayDimKey = keyof typeof overlayDim;
