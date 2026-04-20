/**
 * Backwards-compat adapter — new code should import `Button` from `components/ds`.
 * This wrapper preserves the pre-design-system API so existing callers keep working.
 */
import type { ButtonHTMLAttributes } from 'react';
import { Button, type ButtonVariant } from '../ds/Button';

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
}

export function PixelButton({
	variant = 'primary',
	...props
}: PixelButtonProps) {
	return <Button variant={variant} size="md" {...props} />;
}
