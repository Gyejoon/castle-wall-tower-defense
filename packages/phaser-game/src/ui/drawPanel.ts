/**
 * drawPanel — in-canvas pixel-art frame renderer.
 *
 * Draws a filled rounded rectangle with an outer border and an optional inner
 * highlight line, using tokens from `design/tokens`. Matches the DOM `Card` look.
 *
 * Typical usage in a Phaser scene:
 *   const g = this.add.graphics();
 *   drawPanel(g, { x: 0, y: 0, width: 120, height: 48, intent: 'default' });
 */
import type Phaser from 'phaser';
import { colors, radiusPx } from './tokens';

export type PanelIntent = 'default' | 'accent' | 'danger' | 'warning';

export interface PanelOptions {
	x: number;
	y: number;
	width: number;
	height: number;
	/** Semantic intent selects border/highlight colors */
	intent?: PanelIntent;
	/** Override fill color (defaults to core.panel) */
	fill?: number;
	/** 0..1 fill alpha */
	fillAlpha?: number;
	/** Corner radius key (defaults to 'sm') */
	radius?: keyof typeof radiusPx;
	/** Render the 1px inner highlight line (default true) */
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

/**
 * Draw the panel into `g`. Does NOT clear — caller may call `g.clear()` first.
 * Returns the Graphics for chaining.
 */
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

	// Body fill
	g.fillStyle(fill, fillAlpha);
	g.fillRoundedRect(x, y, width, height, r);

	// Outer border — 2px equivalent (stroke twice)
	g.lineStyle(2, border, 1);
	g.strokeRoundedRect(x, y, width, height, r);

	// Inner highlight (1px inset)
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
