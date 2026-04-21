/**
 * In-canvas text style presets. Consume via `this.add.text(x, y, str, textStyles.h1)`.
 *
 * Presets cover the same scale as `@gld/shared` typography:
 *   display40, h1, h2, body16, body14, label12, caption10
 *
 * Each base style defaults to `core.text` color; use the `tint` helpers to
 * switch foreground without duplicating the whole style object.
 */

import { core } from '@gld/shared';
import type Phaser from 'phaser';
import { textStyles as baseStyles } from './tokens';

export type TextIntent =
	| 'text'
	| 'textSecondary'
	| 'gold'
	| 'accent'
	| 'danger'
	| 'info';

const intentColor: Record<TextIntent, string> = {
	text: core.text,
	textSecondary: core.textSecondary,
	gold: core.gold,
	accent: core.accent,
	danger: core.danger,
	info: core.info,
};

/**
 * Build a text style by combining a scale preset with a tint intent.
 * Returns a new object — safe to mutate.
 */
export function makeTextStyle(
	scale: keyof typeof baseStyles,
	intent: TextIntent = 'text',
	extra?: Phaser.Types.GameObjects.Text.TextStyle,
): Phaser.Types.GameObjects.Text.TextStyle {
	return {
		...baseStyles[scale],
		color: intentColor[intent],
		...extra,
	};
}

export { baseStyles as textStyles };
