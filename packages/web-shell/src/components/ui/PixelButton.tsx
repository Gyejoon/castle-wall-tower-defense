// 하위 호환 어댑터. 신규 코드는 components/ds의 Button 직접 사용.
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
