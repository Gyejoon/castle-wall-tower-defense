export const MAX_TOWER_DISPLAY_WIDTH = 64;
export const TOWER_DISPLAY_WIDTH_RATIO = 1;
export const TOWER_DISPLAY_HEIGHT_RATIO = 1.25;
export const TOWER_VERTICAL_ANCHOR_RATIO = 0;

export function getTowerDisplayMetrics(tileSize: number): {
	width: number;
	height: number;
	yOffset: number;
} {
	const width = Math.round(
		Math.min(tileSize * TOWER_DISPLAY_WIDTH_RATIO, MAX_TOWER_DISPLAY_WIDTH),
	);
	const height = Math.round(width * TOWER_DISPLAY_HEIGHT_RATIO);

	return {
		width,
		height,
		yOffset: height * TOWER_VERTICAL_ANCHOR_RATIO,
	};
}
