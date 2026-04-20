import { zIndex } from '@gld/shared';
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { Panel, type PanelProps } from './Panel';

export type SheetAnchor = 'bottom' | 'top' | 'right';

export interface SheetProps
	extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
	/** Screen edge the sheet is anchored to */
	anchor?: SheetAnchor;
	/** Forward the Panel shell (title, actions, variant, intent) */
	panel?: Omit<PanelProps, 'children'>;
	/** Whether to show a dim backdrop behind the sheet */
	backdrop?: boolean;
	onDismiss?: () => void;
	children: ReactNode;
}

const anchorClass: Record<SheetAnchor, string> = {
	bottom:
		'left-0 right-0 bottom-0 animate-[slideUp_220ms_cubic-bezier(0.05,0.7,0.1,1.0)_both]',
	top: 'left-0 right-0 top-0 animate-[slideDown_220ms_cubic-bezier(0.05,0.7,0.1,1.0)_both]',
	right:
		'top-0 right-0 bottom-0 animate-[slideInFromRight_220ms_cubic-bezier(0.05,0.7,0.1,1.0)_both]',
};

/**
 * Floating sheet anchored to a screen edge.
 * Used for TowerActionSheet, SummonRevealOverlay, bottom action drawers.
 *
 * Wraps the Panel primitive so callers get title/actions slots for free.
 */
export function Sheet({
	anchor = 'bottom',
	panel,
	backdrop = false,
	onDismiss,
	className,
	style,
	children,
	...props
}: SheetProps) {
	const content = (
		<div
			className={cn('fixed', anchorClass[anchor], className)}
			style={{ zIndex: zIndex.floating, ...style }}
			{...props}
		>
			<Panel {...(panel ?? {})}>{children}</Panel>
		</div>
	);

	if (!backdrop) return content;

	const backdropStyle: CSSProperties = {
		zIndex: zIndex.floating - 1,
		backgroundColor: 'rgba(0, 0, 0, 0.35)',
	};
	return (
		<>
			<div
				className="fixed inset-0 animate-[fadeIn_220ms_ease-out_both]"
				style={backdropStyle}
				onClick={onDismiss}
				aria-hidden="true"
			/>
			{content}
		</>
	);
}
