// 하위 호환 어댑터. 신규 코드는 components/ds의 Card/Panel 직접 사용.
import type { HTMLAttributes } from 'react';
import { Card } from '../ds/Card';

export function PixelPanel(props: HTMLAttributes<HTMLDivElement>) {
	return <Card variant="panel" intent="default" {...props} />;
}
