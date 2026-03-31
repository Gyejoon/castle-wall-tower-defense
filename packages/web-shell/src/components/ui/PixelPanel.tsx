import type { HTMLAttributes } from 'react';
import { colors } from '../../styles/tokens';

export function PixelPanel({
	style,
	children,
	...props
}: HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			style={{
				background: colors.panel,
				border: `2px solid ${colors.border}`,
				boxShadow: `4px 4px 0px ${colors.border}`,
				padding: '16px',
				...style,
			}}
			{...props}
		>
			{children}
		</div>
	);
}
