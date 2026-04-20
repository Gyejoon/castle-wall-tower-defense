/**
 * Backwards-compat adapter — new code should import `Card` or `Panel` from `components/ds`.
 */
import type { HTMLAttributes } from 'react';
import { Card } from '../ds/Card';

export function PixelPanel(props: HTMLAttributes<HTMLDivElement>) {
	return <Card variant="panel" intent="default" {...props} />;
}
