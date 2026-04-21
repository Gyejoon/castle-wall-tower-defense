import { core, surface, tier } from '@gld/shared';
import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export type CardVariant = 'panel' | 'framed' | 'keyart';
export type CardIntent = 'default' | 'accent' | 'danger';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
	variant?: CardVariant;
	intent?: CardIntent;
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

const framedGradient: Record<CardIntent, string> = {
	default: `linear-gradient(180deg, ${core.gold} 0%, ${core.accent} 50%, ${core.border} 100%)`,
	accent: `linear-gradient(180deg, ${core.accent} 0%, ${core.gold} 50%, ${core.accent} 100%)`,
	danger: `linear-gradient(180deg, ${tier[6].bright} 0%, ${core.danger} 50%, ${tier[4].dark} 100%)`,
};

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
					background: framedGradient[intent],
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

	const keyartBorder = intent === 'default' ? core.accent : border;
	const keyartGlow =
		intent === 'default' ? 'rgba(200, 160, 74, 0.28)' : intentGlow[intent];
	return (
		<div
			className={cn(base, 'rounded-md p-lg overflow-hidden', className)}
			style={{
				background: `linear-gradient(160deg, ${surface.alpha.panel85} 0%, ${surface.alpha.bg80} 100%)`,
				border: `2px solid ${keyartBorder}`,
				boxShadow: `0 6px 0 rgba(10, 8, 4, 0.65), 0 0 24px ${keyartGlow}, 0 0 0 1px rgba(255, 255, 255, 0.04) inset`,
				...style,
			}}
			{...props}
		>
			{children}
		</div>
	);
}
