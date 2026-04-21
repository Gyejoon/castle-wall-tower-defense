import {
	core,
	element as elementColors,
	tier as tierColors,
} from '@gld/shared';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type BadgeVariant = 'pill' | 'tag' | 'counter';
export type BadgeIntent =
	| 'default'
	| 'accent'
	| 'gold'
	| 'info'
	| 'success'
	| 'danger'
	| 'warning'
	| `tier-${1 | 2 | 3 | 4 | 5 | 6}`
	| `element-${keyof typeof elementColors}`;

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
	variant?: BadgeVariant;
	intent?: BadgeIntent;
	/** Leading icon (emoji, SVG element, or image) */
	icon?: ReactNode;
}

interface IntentColors {
	fg: string;
	bg: string;
	border: string;
}

function resolveIntent(intent: BadgeIntent): IntentColors {
	if (intent.startsWith('tier-')) {
		const t = Number(intent.split('-')[1]) as 1 | 2 | 3 | 4 | 5 | 6;
		const c = tierColors[t];
		return { fg: core.text, bg: c.dark, border: c.primary };
	}
	if (intent.startsWith('element-')) {
		const e = intent.split('-')[1] as keyof typeof elementColors;
		const c = elementColors[e];
		return { fg: core.text, bg: c.primary, border: c.glow };
	}
	switch (intent) {
		case 'accent':
			return {
				fg: core.text,
				bg: 'rgba(200, 160, 74, 0.15)',
				border: core.accent,
			};
		case 'gold':
			return { fg: core.bg, bg: core.gold, border: core.accent };
		case 'info':
			return { fg: core.bg, bg: core.info, border: core.info };
		case 'success':
			return { fg: core.bg, bg: core.success, border: core.success };
		case 'danger':
			return { fg: core.text, bg: core.danger, border: core.danger };
		case 'warning':
			return {
				fg: core.bg,
				bg: 'var(--color-state-warning)',
				border: 'var(--color-state-warning)',
			};
		default:
			return { fg: core.text, bg: core.panel, border: core.border };
	}
}

const variantClass: Record<BadgeVariant, string> = {
	pill: 'rounded-pill px-sm py-[2px] text-[10px] font-bold',
	tag: 'rounded-xs px-xs py-[2px] text-[10px] font-bold tracking-wider uppercase',
	counter: 'rounded-sm px-sm py-[2px] text-[12px] font-bold tabular-nums',
};

/**
 * Compact label used for HUD values, tier tags, counters.
 *  - pill:    HP/Energy mini chip (TopHud)
 *  - tag:     tier / family tag on tower cards
 *  - counter: numeric + icon (energy cost, inventory count)
 */
export function Badge({
	variant = 'pill',
	intent = 'default',
	icon,
	className,
	style,
	children,
	...props
}: BadgeProps) {
	const colors = resolveIntent(intent);
	const merged: CSSProperties = {
		backgroundColor: colors.bg,
		borderColor: colors.border,
		color: colors.fg,
		...style,
	};
	return (
		<span
			className={cn(
				'inline-flex items-center gap-xs border-2 font-pixel whitespace-nowrap leading-none',
				variantClass[variant],
				className,
			)}
			style={merged}
			{...props}
		>
			{icon ? <span className="inline-flex items-center">{icon}</span> : null}
			{children}
		</span>
	);
}
