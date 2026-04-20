import { core, surface } from '@gld/shared';
import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export type CardVariant = 'panel' | 'framed' | 'keyart';
export type CardIntent = 'default' | 'accent' | 'danger';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
	variant?: CardVariant;
	intent?: CardIntent;
	/** Adds a subtle inner glow for emphasis */
	highlight?: boolean;
}

const intentBorder: Record<CardIntent, string> = {
	default: core.border,
	accent: core.accent,
	danger: core.danger,
};

const intentGlow: Record<CardIntent, string> = {
	default: 'transparent',
	accent: 'rgba(200, 160, 74, 0.25)',
	danger: 'rgba(192, 48, 32, 0.25)',
};

/**
 * Container primitive for grouped content. Three variants:
 *   - panel:   base card (bordered, solid background)
 *   - framed:  gold-edge frame + inner panel, used for gacha cards/upgrade choices
 *   - keyart:  translucent overlay card for lobby hero art (gradient backdrop)
 */
export function Card({
	variant = 'panel',
	intent = 'default',
	highlight = false,
	className,
	style,
	children,
	...props
}: CardProps) {
	const border = intentBorder[intent];

	const base = 'relative';

	if (variant === 'panel') {
		const merged: CSSProperties = {
			backgroundColor: core.panel,
			borderColor: border,
			boxShadow: highlight
				? `0 3px 0 rgba(10, 8, 4, 0.5), 0 0 0 2px ${intentGlow[intent]} inset`
				: '0 3px 0 rgba(10, 8, 4, 0.5)',
			...style,
		};
		return (
			<div
				className={cn(base, 'border-2 rounded-sm p-md', className)}
				style={merged}
				{...props}
			>
				{children}
			</div>
		);
	}

	if (variant === 'framed') {
		return (
			<div
				className={cn(base, 'p-[3px] rounded-md', className)}
				style={{
					background: `linear-gradient(180deg, ${core.gold} 0%, ${core.accent} 50%, ${core.border} 100%)`,
					boxShadow: highlight
						? `0 0 16px ${intentGlow[intent]}, 0 4px 0 rgba(10, 8, 4, 0.6)`
						: '0 4px 0 rgba(10, 8, 4, 0.6)',
					...style,
				}}
				{...props}
			>
				<div
					className="rounded-sm p-md"
					style={{
						backgroundColor: surface.panelElevated,
						border: `1px solid ${border}`,
					}}
				>
					{children}
				</div>
			</div>
		);
	}

	// keyart
	return (
		<div
			className={cn(base, 'rounded-md p-lg overflow-hidden', className)}
			style={{
				background: `linear-gradient(160deg, ${surface.alpha.panel70} 0%, ${surface.alpha.bg76} 100%)`,
				border: `1px solid ${border}`,
				boxShadow: `0 6px 0 rgba(10, 8, 4, 0.6), 0 0 24px ${intentGlow[intent]}`,
				...style,
			}}
			{...props}
		>
			{children}
		</div>
	);
}
