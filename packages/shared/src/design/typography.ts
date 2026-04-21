/**
 * Typography scale — pixel-font hierarchy for DOM and Canvas.
 *
 * Scale: display (hero) → h1/h2 (section) → body (default) → label/caption (metadata).
 * Numbers are emphasized with Press Start 2P; Galmuri11 handles Korean + default.
 *
 * Consumers:
 *   - Tailwind @theme reads `fontFamily` via `--font-pixel`/`--font-display` (global.css).
 *   - React components use `className="text-body"` or `style={{ fontSize: typography.body.size }}`.
 *   - Phaser BitmapText uses the scale via `packages/phaser-game/src/ui/textStyles.ts`.
 */

export const fontFamily = {
	/** Primary — Korean + Latin pixel font */
	pixel: "'Galmuri11', 'Press Start 2P', cursive",
	/** Secondary — digit-heavy emphasis (counters, big numbers) */
	display: "'Press Start 2P', 'Galmuri11', cursive",
} as const;

export const fontWeight = {
	regular: 400,
	bold: 700,
} as const;

/** Line-height is expressed as unitless number (multiplier of font-size) */
export const typography = {
	/** Hero / game-over banner / win screen title */
	display40: {
		family: fontFamily.display,
		size: '40px',
		lineHeight: 1.1,
		weight: fontWeight.bold,
	},
	display32: {
		family: fontFamily.display,
		size: '32px',
		lineHeight: 1.15,
		weight: fontWeight.bold,
	},
	/** Section heading (modal title, lobby tab title) */
	h1: {
		family: fontFamily.pixel,
		size: '24px',
		lineHeight: 1.25,
		weight: fontWeight.bold,
	},
	h2: {
		family: fontFamily.pixel,
		size: '20px',
		lineHeight: 1.3,
		weight: fontWeight.bold,
	},
	/** Default body copy */
	body16: {
		family: fontFamily.pixel,
		size: '16px',
		lineHeight: 1.4,
		weight: fontWeight.regular,
	},
	body14: {
		family: fontFamily.pixel,
		size: '14px',
		lineHeight: 1.4,
		weight: fontWeight.regular,
	},
	/** Label — button text, pill badge, tab label */
	label12: {
		family: fontFamily.pixel,
		size: '12px',
		lineHeight: 1.2,
		weight: fontWeight.bold,
	},
	/** Caption — meta text, timestamp, footnote */
	caption10: {
		family: fontFamily.pixel,
		size: '10px',
		lineHeight: 1.2,
		weight: fontWeight.regular,
	},
} as const;

export type TypographyScale = keyof typeof typography;
