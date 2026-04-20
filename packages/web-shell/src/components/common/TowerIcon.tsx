import { useState } from 'react';

interface TowerIconProps {
	towerId: string;
	size?: number;
	className?: string;
}

/**
 * Minimal tower sprite resolver — looks up `assets/towers/{towerId}.webp`.
 * Phase 11 will redesign placeholder sprites; for now we fall back to a
 * subtle empty box if the asset is missing so consumers don't render
 * broken image icons.
 */
export function TowerIcon({ towerId, size = 40, className }: TowerIconProps) {
	const [failed, setFailed] = useState(false);

	if (failed) {
		return (
			<div
				className={className}
				style={{
					width: size,
					height: size,
					background: 'var(--color-panel-85)',
					border: '1px solid var(--color-border)',
				}}
			/>
		);
	}

	return (
		<img
			src={`assets/towers/${towerId}.webp`}
			alt=""
			width={size}
			height={size}
			className={className}
			style={{ imageRendering: 'pixelated' }}
			onError={() => setFailed(true)}
		/>
	);
}
