/**
 * UI color palette shared across React (DOM) and Phaser (Canvas).
 * Phaser uses 0x-prefixed number format; React uses hex strings.
 *
 * Source of truth for the design system — see .impeccable.md
 */

export const UI_COLORS = {
	bg: '#1a1208',
	panel: '#2a2010',
	border: '#4a3a20',
	accent: '#c8a04a',
	success: '#7ab648',
	danger: '#c03020',
	gold: '#f0d060',
	info: '#5bc8e8',
	text: '#f0e8d8',
	textSecondary: '#a09070',
	gradeUnique: '#9060e0',
	tierBright: '#ffe870',
	bossPhase1: '#c87020',
	armorPierce: '#a0a8b0',
} as const;

/** Same palette as UI_COLORS but in Phaser-compatible 0x number format */
export const PHASER_COLORS = {
	bg: 0x1a1208,
	panel: 0x2a2010,
	border: 0x4a3a20,
	accent: 0xc8a04a,
	success: 0x7ab648,
	danger: 0xc03020,
	gold: 0xf0d060,
	info: 0x5bc8e8,
	text: 0xf0e8d8,
	textSecondary: 0xa09070,
	gradeUnique: 0x9060e0,
	tierBright: 0xffe870,
	bossPhase1: 0xc87020,
	armorPierce: 0xa0a8b0,
} as const;
