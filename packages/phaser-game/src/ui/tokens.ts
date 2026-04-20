/**
 * Phaser-friendly adapter over `@gld/shared/design` tokens.
 *
 * Converts hex strings to 0x numbers (Phaser expects number format for fill/stroke),
 * and exposes spacing/radius as plain numbers (px).
 *
 * Import here instead of re-deriving hex literals inside systems/scenes.
 */

import {
	core,
	duration,
	element,
	motion,
	palette,
	radius,
	spacing,
	state,
	tier,
	typography,
	zIndex,
} from '@gld/shared';

const toHex = (hex: string): number => Number.parseInt(hex.slice(1), 16);

const mapValues = <T extends Record<string, string>>(
	obj: T,
): Record<keyof T, number> => {
	const out = {} as Record<keyof T, number>;
	for (const key of Object.keys(obj) as Array<keyof T>) {
		out[key] = toHex(obj[key]);
	}
	return out;
};

/** 0x-format colors for Phaser Graphics/Text fills & strokes */
export const colors = {
	core: mapValues(core),
	state: {
		hover: toHex(state.hover),
		focus: toHex(state.focus),
		warning: toHex(state.warning),
		pressed: toHex(state.pressed),
	},
	element: {
		fire: {
			primary: toHex(element.fire.primary),
			glow: toHex(element.fire.glow),
		},
		water: {
			primary: toHex(element.water.primary),
			glow: toHex(element.water.glow),
		},
		lightning: {
			primary: toHex(element.lightning.primary),
			glow: toHex(element.lightning.glow),
		},
		earth: {
			primary: toHex(element.earth.primary),
			glow: toHex(element.earth.glow),
		},
		neutral: {
			primary: toHex(element.neutral.primary),
			glow: toHex(element.neutral.glow),
		},
	},
	tier: {
		1: {
			primary: toHex(tier[1].primary),
			dark: toHex(tier[1].dark),
			bright: toHex(tier[1].bright),
		},
		2: {
			primary: toHex(tier[2].primary),
			dark: toHex(tier[2].dark),
			bright: toHex(tier[2].bright),
		},
		3: {
			primary: toHex(tier[3].primary),
			dark: toHex(tier[3].dark),
			bright: toHex(tier[3].bright),
		},
		4: {
			primary: toHex(tier[4].primary),
			dark: toHex(tier[4].dark),
			bright: toHex(tier[4].bright),
		},
		5: {
			primary: toHex(tier[5].primary),
			dark: toHex(tier[5].dark),
			bright: toHex(tier[5].bright),
		},
		6: {
			primary: toHex(tier[6].primary),
			dark: toHex(tier[6].dark),
			bright: toHex(tier[6].bright),
		},
	},
} as const;

/** Spacing in px numbers — Phaser consumes numeric pixel offsets */
export const spacingPx = spacing;
/** Radius in px numbers — for Graphics.fillRoundedRect */
export const radiusPx = radius;
/** Motion duration in ms — for Phaser Tweens `duration` */
export const durationMs = duration;

/** Typography presets converted to Phaser TextStyle objects */
const pxSize = (v: string): number => Number.parseInt(v.replace('px', ''), 10);

export const textStyles = {
	display40: {
		fontFamily: typography.display40.family,
		fontSize: `${pxSize(typography.display40.size)}px`,
		color: core.text,
	},
	h1: {
		fontFamily: typography.h1.family,
		fontSize: `${pxSize(typography.h1.size)}px`,
		color: core.text,
	},
	h2: {
		fontFamily: typography.h2.family,
		fontSize: `${pxSize(typography.h2.size)}px`,
		color: core.text,
	},
	body16: {
		fontFamily: typography.body16.family,
		fontSize: `${pxSize(typography.body16.size)}px`,
		color: core.text,
	},
	body14: {
		fontFamily: typography.body14.family,
		fontSize: `${pxSize(typography.body14.size)}px`,
		color: core.text,
	},
	label12: {
		fontFamily: typography.label12.family,
		fontSize: `${pxSize(typography.label12.size)}px`,
		color: core.text,
	},
	caption10: {
		fontFamily: typography.caption10.family,
		fontSize: `${pxSize(typography.caption10.size)}px`,
		color: core.textSecondary,
	},
} as const;

/** Backwards-compat re-export; existing code imports `PHASER_COLORS` from @gld/shared. */
export { PHASER_COLORS } from '@gld/shared';
export { motion, palette, zIndex };
