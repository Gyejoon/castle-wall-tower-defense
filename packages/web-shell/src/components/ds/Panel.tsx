import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { Card, type CardIntent, type CardVariant } from './Card';

export interface PanelProps
	extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
	title?: ReactNode;
	/** Element rendered to the right of the title (e.g., close button) */
	titleTrailing?: ReactNode;
	/** Optional footer action row */
	actions?: ReactNode;
	variant?: CardVariant;
	intent?: CardIntent;
}

/**
 * Panel = Card + title row + body + actions row.
 * Used for TowerActionSheet, PauseModal, UpgradePick columns, etc.
 */
export function Panel({
	title,
	titleTrailing,
	actions,
	variant = 'panel',
	intent = 'default',
	className,
	children,
	...props
}: PanelProps) {
	return (
		<Card
			variant={variant}
			intent={intent}
			className={cn('flex flex-col gap-sm', className)}
			{...props}
		>
			{(title || titleTrailing) && (
				<div className="flex items-center justify-between gap-sm">
					{title ? (
						<div className="font-pixel font-bold text-[14px] text-text">
							{title}
						</div>
					) : (
						<span />
					)}
					{titleTrailing}
				</div>
			)}
			<div className="flex-1">{children}</div>
			{actions && (
				<div className="flex items-center justify-end gap-sm pt-xs">
					{actions}
				</div>
			)}
		</Card>
	);
}
