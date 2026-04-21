import type Phaser from 'phaser';
import { colors, radiusPx } from './tokens';

export type BadgeIntent =
	| 'default'
	| 'accent'
	| 'gold'
	| 'warning'
	| 'danger'
	| `tier-${1 | 2 | 3 | 4 | 5 | 6}`;

export interface BadgeOptions {
	x: number;
	y: number;
	width: number;
	height: number;
	intent?: BadgeIntent;
	radius?: keyof typeof radiusPx;
}

interface BadgeColors {
	fill: number;
	border: number;
}

function resolveIntent(intent: BadgeIntent): BadgeColors {
	if (intent.startsWith('tier-')) {
		const t = Number(intent.split('-')[1]) as 1 | 2 | 3 | 4 | 5 | 6;
		const c = colors.tier[t];
		return { fill: c.dark, border: c.primary };
	}
	switch (intent) {
		case 'accent':
			return { fill: colors.core.panel, border: colors.core.accent };
		case 'gold':
			return { fill: colors.core.gold, border: colors.core.accent };
		case 'warning':
			return { fill: colors.core.panel, border: colors.state.warning };
		case 'danger':
			return { fill: colors.core.danger, border: colors.core.danger };
		default:
			return { fill: colors.core.panel, border: colors.core.border };
	}
}

export function drawBadge(
	g: Phaser.GameObjects.Graphics,
	opts: BadgeOptions,
): Phaser.GameObjects.Graphics {
	const { x, y, width, height, intent = 'default', radius = 'pill' } = opts;
	const r = Math.min(radiusPx[radius], Math.floor(height / 2));
	const { fill, border } = resolveIntent(intent);

	g.fillStyle(fill, 1);
	g.fillRoundedRect(x, y, width, height, r);
	g.lineStyle(1, border, 1);
	g.strokeRoundedRect(x, y, width, height, r);
	return g;
}
