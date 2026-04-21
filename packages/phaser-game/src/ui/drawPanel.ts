import type Phaser from 'phaser';
import { colors, radiusPx } from './tokens';

export type PanelIntent = 'default' | 'accent' | 'danger' | 'warning';

export interface PanelOptions {
	x: number;
	y: number;
	width: number;
	height: number;
	intent?: PanelIntent;
	fill?: number;
	fillAlpha?: number;
	radius?: keyof typeof radiusPx;
	highlight?: boolean;
}

function intentBorder(intent: PanelIntent): number {
	switch (intent) {
		case 'accent':
			return colors.core.accent;
		case 'danger':
			return colors.core.danger;
		case 'warning':
			return colors.state.warning;
		default:
			return colors.core.border;
	}
}

// g.clear()는 호출자 책임.
export function drawPanel(
	g: Phaser.GameObjects.Graphics,
	opts: PanelOptions,
): Phaser.GameObjects.Graphics {
	const {
		x,
		y,
		width,
		height,
		intent = 'default',
		fill = colors.core.panel,
		fillAlpha = 0.95,
		radius = 'sm',
		highlight = true,
	} = opts;
	const r = radiusPx[radius];
	const border = intentBorder(intent);

	g.fillStyle(fill, fillAlpha);
	g.fillRoundedRect(x, y, width, height, r);

	g.lineStyle(2, border, 1);
	g.strokeRoundedRect(x, y, width, height, r);

	if (highlight) {
		g.lineStyle(1, colors.core.gold, 0.18);
		g.strokeRoundedRect(
			x + 2,
			y + 2,
			width - 4,
			height - 4,
			Math.max(0, r - 1),
		);
	}
	return g;
}
