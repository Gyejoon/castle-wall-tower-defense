import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

export function PixelPanel({
	className,
	style,
	children,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn(
				'p-4 bg-panel border-2 border-border shadow-[4px_4px_0px_#4a3a20]',
				className,
			)}
			style={style}
			{...props}
		>
			{children}
		</div>
	);
}
