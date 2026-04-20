/**
 * Color palette — single source of truth for all colors used across the game.
 *
 * Consumers:
 *   - `packages/shared/src/constants/ui-colors.ts` (re-exports `core` + derived PHASER_COLORS)
 *   - `packages/web-shell/src/styles/global.css` (@theme variable mapping)
 *   - `packages/phaser-game/src/ui/tokens.ts` (0x-format adapter)
 *   - `scripts/generate-assets/shared.ts` (core/state/element/tier imports)
 *
 * Any new color must be added here first. Do not introduce hex literals elsewhere.
 */

/** Core UI palette — 13 named colors used across DOM and Canvas */
export const core = {
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

/** Interactive state colors — derived from core, kept here to avoid ad-hoc lighten/darken in components */
export const state = {
	/** hover ring + lighter border on interactive elements */
	hover: '#e0b860', // +12% lightness over accent
	/** focus ring — use as outline or box-shadow glow */
	focus: '#ffcf66',
	/** disabled foreground / reduced-contrast text */
	disabledFg: 'rgba(240, 232, 216, 0.4)',
	/** disabled background overlay */
	disabledBg: 'rgba(74, 58, 32, 0.5)',
	/** warning — non-destructive caution (energy low, cooldown) */
	warning: '#c88c40',
	/** pressed/active depth color (bottom shadow on PixelButton) */
	pressed: '#7a5a10',
} as const;

/** Element attribute colors — fire/water/lightning/earth/neutral */
export const element = {
	fire: { primary: '#e74c3c', glow: '#ff6b4a' },
	water: { primary: '#3498db', glow: '#5dade2' },
	lightning: { primary: '#f39c12', glow: '#f7b731' },
	earth: { primary: '#8b6a40', glow: '#b8956a' },
	neutral: { primary: '#c8a04a', glow: '#f0d060' },
} as const;

/** Tier colors — T1 ~ T6 progression palette */
export const tier = {
	1: { primary: '#c8a04a', dark: '#8b6a2a', bright: '#e0b860' }, // Common
	2: { primary: '#5bc8e8', dark: '#3a90b0', bright: '#80d8f0' }, // Rare
	3: { primary: '#c040d0', dark: '#8020a0', bright: '#d880e8' }, // Heroic — matches pixel-art tierHeroic
	4: { primary: '#e04040', dark: '#a02020', bright: '#f06060' }, // Legendary
	5: { primary: '#f0d060', dark: '#c0a030', bright: '#ffe89a' }, // God
	6: { primary: '#ff6b4a', dark: '#c04020', bright: '#ff9070' }, // Ultimate (T6 hybrid)
} as const;

/** Surface colors — semantic backgrounds with alpha variants */
export const surface = {
	/** page background */
	bg: core.bg,
	/** panel — base card surface */
	panel: core.panel,
	/** panel elevated — one level above panel (e.g., floating sheet on dimmed background) */
	panelElevated: '#352818',
	/** panel sunken — inset surface (e.g., input well, stat bar track) */
	panelSunken: '#1f1608',
	/** alpha variants — used for layered translucency */
	alpha: {
		bg76: 'rgba(26, 18, 8, 0.76)',
		bg80: 'rgba(26, 18, 8, 0.8)',
		bg95: 'rgba(26, 18, 8, 0.95)',
		panel70: 'rgba(42, 32, 16, 0.7)',
		panel85: 'rgba(42, 32, 16, 0.85)',
		panel90: 'rgba(42, 32, 16, 0.9)',
		panel92: 'rgba(42, 32, 16, 0.92)',
		panel95: 'rgba(42, 32, 16, 0.95)',
		panel96: 'rgba(42, 32, 16, 0.96)',
		overlay60: 'rgba(0, 0, 0, 0.6)',
		overlay70: 'rgba(0, 0, 0, 0.7)',
		overlayDark: 'rgba(10, 8, 4, 0.82)',
		overlayHeavy: 'rgba(10, 8, 4, 0.92)',
		danger20: 'rgba(192, 48, 32, 0.2)',
		accent20: 'rgba(200, 160, 74, 0.2)',
	},
} as const;

/** Convenience: all palette groups under one namespace */
export const palette = {
	core,
	state,
	element,
	tier,
	surface,
} as const;

export type CoreColor = keyof typeof core;
export type StateColor = keyof typeof state;
export type ElementKey = keyof typeof element;
export type TierKey = keyof typeof tier;
