import { core } from '@gld/shared';
import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import { cn } from '../../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	loading?: boolean;
	block?: boolean;
}

const variantColor: Record<ButtonVariant, string> = {
	primary: core.accent,
	secondary: core.border,
	gold: core.gold,
	danger: core.danger,
};

const variantText: Record<ButtonVariant, string> = {
	primary: core.text,
	secondary: core.text,
	gold: core.bg,
	danger: core.text,
};

const sizeClass: Record<ButtonSize, string> = {
	sm: 'px-sm py-xs text-[12px] min-h-[28px]',
	md: 'px-lg py-sm text-[14px] min-h-[36px]',
	lg: 'px-xl py-md text-[16px] min-h-[44px]',
};

export function Button({
	variant = 'primary',
	size = 'md',
	loading = false,
	block = false,
	className,
	style,
	children,
	disabled,
	type,
	onMouseDown,
	onMouseUp,
	onMouseLeave,
	onTouchStart,
	onTouchEnd,
	...props
}: ButtonProps) {
	const color = variantColor[variant];
	const text = variantText[variant];
	const isDisabled = Boolean(disabled) || loading;

	const resting: CSSProperties = {
		borderColor: color,
		color: text,
		boxShadow: `0 3px 0 ${color}, 0 0 0 1px rgba(0, 0, 0, 0.35) inset`,
		backgroundColor: variant === 'gold' ? color : core.panel,
		...style,
	};

	const pressOn = (e: { currentTarget: HTMLButtonElement }) => {
		if (isDisabled) return;
		e.currentTarget.style.transform = 'translateY(3px)';
		e.currentTarget.style.boxShadow = `0 0 0 ${color}, 0 0 0 1px rgba(0, 0, 0, 0.35) inset`;
	};
	const pressOff = (e: { currentTarget: HTMLButtonElement }) => {
		if (isDisabled) return;
		e.currentTarget.style.transform = 'translateY(0)';
		e.currentTarget.style.boxShadow = `0 3px 0 ${color}, 0 0 0 1px rgba(0, 0, 0, 0.35) inset`;
	};

	return (
		<button
			type={type ?? 'button'}
			className={cn(
				'font-pixel font-bold border-2 text-center select-none',
				'transition-[transform,box-shadow,background-color,opacity] duration-[120ms] ease-[cubic-bezier(0.2,0,0.2,1)]',
				'inline-flex items-center justify-center gap-xs rounded-sm',
				'focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-state-focus)]',
				sizeClass[size],
				block ? 'w-full' : '',
				isDisabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
				className,
			)}
			style={resting}
			disabled={isDisabled}
			aria-busy={loading || undefined}
			onMouseDown={(e) => {
				pressOn(e);
				onMouseDown?.(e);
			}}
			onMouseUp={(e) => {
				pressOff(e);
				onMouseUp?.(e);
			}}
			onMouseLeave={(e) => {
				pressOff(e);
				onMouseLeave?.(e);
			}}
			onTouchStart={(e) => {
				pressOn(e as unknown as { currentTarget: HTMLButtonElement });
				onTouchStart?.(e);
			}}
			onTouchEnd={(e) => {
				pressOff(e as unknown as { currentTarget: HTMLButtonElement });
				onTouchEnd?.(e);
			}}
			{...props}
		>
			{loading ? <LoadingDots /> : children}
		</button>
	);
}

function LoadingDots() {
	return (
		<span
			className="inline-block"
			style={{ color: 'inherit', letterSpacing: '0.1em' }}
			role="img"
			aria-label="loading"
		>
			...
		</span>
	);
}
