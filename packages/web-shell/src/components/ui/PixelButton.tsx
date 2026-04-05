import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { colors } from '../../styles/tokens';

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
	className,
	style,
	children,
	...props
}: PixelButtonProps) {
	const color = variantColors[variant];
	const disabled = Boolean(props.disabled);

	return (
		<button
			className={cn(
				'font-pixel text-sm px-6 py-3 bg-panel text-text border-2 text-center transition-[transform,box-shadow] duration-100',
				disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
				className,
			)}
			style={{
				borderColor: color,
				boxShadow: `4px 4px 0px ${color}`,
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
