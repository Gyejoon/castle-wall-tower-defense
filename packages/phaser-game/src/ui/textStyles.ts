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
