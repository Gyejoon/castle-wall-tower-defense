/**
 * Spacing scale — 4px base grid.
 *
 * Usage: prefer tokens over raw px literals in new code.
 *   React: `className="p-md gap-sm"` (mapped via Tailwind @theme)
 *   Phaser: `drawPanel(g, { padding: spacing.md })`
 */

export const spacing = {
	/** 4px — hairline, inline gap between tight elements */
	xs: 4,
	/** 8px — small gap, icon/label pair */
	sm: 8,
	/** 12px — default inner padding */
	md: 12,
	/** 16px — comfortable padding, section gap */
	lg: 16,
	/** 24px — separated section, overlay margin */
	xl: 24,
	/** 32px — major section break */
	'2xl': 32,
	/** 48px — hero padding, empty-state */
	'3xl': 48,
} as const;

export type SpacingKey = keyof typeof spacing;
