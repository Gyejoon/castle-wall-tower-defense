import type { ButtonHTMLAttributes } from 'react';
import { colors, fonts } from '../../styles/tokens';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'primary' | 'secondary' | 'danger' | 'gold';
}

const variantColors = {
	primary: colors.accent,
	secondary: colors.textSecondary,
	danger: colors.danger,
	gold: colors.gold,
} as const;

export function PixelButton({
	variant = 'primary',
	style,
	children,
	...props
}: PixelButtonProps) {
	const color = variantColors[variant];
	const disabled = Boolean(props.disabled);

	return (
		<button
			style={{
				fontFamily: fonts.pixel,
				fontSize: '14px',
				padding: '12px 24px',
				background: colors.panel,
				color: colors.text,
				border: `2px solid ${color}`,
				boxShadow: `4px 4px 0px ${color}`,
				cursor: disabled ? 'not-allowed' : 'pointer',
				opacity: disabled ? 0.6 : 1,
				transition: 'transform 0.1s, box-shadow 0.1s',
				...style,
			}}
			onMouseEnter={(e) => {
				if (disabled) return;
				e.currentTarget.style.transform = 'translate(2px, 2px)';
				e.currentTarget.style.boxShadow = `2px 2px 0px ${color}`;
			}}
			onMouseLeave={(e) => {
				if (disabled) return;
				e.currentTarget.style.transform = 'translate(0, 0)';
				e.currentTarget.style.boxShadow = `4px 4px 0px ${color}`;
			}}
			{...props}
		>
			{children}
		</button>
	);
}
