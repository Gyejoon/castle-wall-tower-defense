import { overlayDim, zIndex } from '@gld/shared';
import {
	type CSSProperties,
	type HTMLAttributes,
	type ReactNode,
	useEffect,
} from 'react';
import { cn } from '../../utils/cn';

export type OverlayIntent = 'pause' | 'result' | 'choice' | 'reveal';

export interface OverlayProps extends HTMLAttributes<HTMLDivElement> {
	intent?: OverlayIntent;
	/** Dim strength — overrides intent default */
	dim?: keyof typeof overlayDim;
	/** Whether to trap clicks on the backdrop */
	dismissOnBackdrop?: boolean;
	onDismiss?: () => void;
	/** The focused content — rendered centered or as intent-specific layout */
	children: ReactNode;
}

const intentDim: Record<OverlayIntent, keyof typeof overlayDim> = {
	pause: 'heavy',
	result: 'cinematic',
	choice: 'default',
	reveal: 'heavy',
};

/**
 * Full-viewport overlay with dimmed backdrop.
 * Intent defines default dim level and layout affordances:
 *   - pause:   centered small panel (confirm/resume)
 *   - result:  centered large panel + banner above (victory/defeat)
 *   - choice:  top-anchored title + side-by-side choices (upgrade pick)
 *   - reveal:  centered card with room for burst/particle effects (summon)
 */
export function Overlay({
	intent = 'pause',
	dim,
	dismissOnBackdrop = false,
	onDismiss,
	className,
	style,
	children,
	...props
}: OverlayProps) {
	const dimLevel = dim ?? intentDim[intent];
	const bg = overlayDim[dimLevel];

	const layoutClass = (() => {
		switch (intent) {
			case 'choice':
				return 'flex flex-col items-center justify-start pt-xl px-lg gap-lg';
			case 'result':
				return 'flex flex-col items-center justify-center gap-lg px-lg';
			case 'reveal':
				return 'flex items-center justify-center px-lg';
			default:
				return 'flex items-center justify-center px-lg';
		}
	})();

	const merged: CSSProperties = {
		backgroundColor: bg,
		zIndex:
			intent === 'pause' || intent === 'result' ? zIndex.modal : zIndex.overlay,
		...style,
	};

	// Escape dismissal is window-scoped so it fires without needing tabIndex/focus.
	useEffect(() => {
		if (!dismissOnBackdrop || !onDismiss) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onDismiss();
		};
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('keydown', onKey);
		};
	}, [dismissOnBackdrop, onDismiss]);

	const handleBackdrop = (e: {
		target: EventTarget;
		currentTarget: EventTarget;
	}) => {
		if (dismissOnBackdrop && e.target === e.currentTarget) onDismiss?.();
	};

	const isDialog = intent === 'pause' || intent === 'result';
	const commonProps = {
		className: cn('fixed inset-0', layoutClass, className),
		style: merged,
		onClick: handleBackdrop,
		...props,
	};

	if (isDialog) {
		return (
			// biome-ignore lint/a11y/useSemanticElements: native <dialog> requires imperative open/close; custom overlay uses ARIA dialog semantics
			<div role="dialog" aria-modal="true" {...commonProps}>
				{children}
			</div>
		);
	}
	return (
		<div role="presentation" {...commonProps}>
			{children}
		</div>
	);
}
