/** Visual theme for each map in Phaser scenes */
export interface MapTheme {
	start: number;
	end: number;
	border: number;
	emoji: string;
}

export const MAP_THEMES: Record<string, MapTheme> = {
	forest_gate: {
		start: 0x2d5a1e,
		end: 0x1a3a10,
		border: 0x4a8a2a,
		emoji: '🌳',
	},
	lava_fortress: {
		start: 0x8a2a0a,
		end: 0x5a1a08,
		border: 0xc04020,
		emoji: '🌋',
	},
	storm_citadel: {
		start: 0x2a3a6a,
		end: 0x1a2848,
		border: 0x5a6aaa,
		emoji: '⚡',
	},
};

export const LOCKED_THEME: MapTheme = {
	start: 0x3a3a3a,
	end: 0x2a2a2a,
	border: 0x4a4a4a,
	emoji: '🔒',
};

/** Node positions as ratios of screen size */
export const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
	forest_gate: { x: 0.5, y: 0.78 },
	lava_fortress: { x: 0.25, y: 0.5 },
	storm_citadel: { x: 0.72, y: 0.22 },
};
