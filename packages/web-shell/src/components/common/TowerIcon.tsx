import { useState } from 'react';

const TOWER_ASSET_VERSION = 'pr193-towers-runtime-v2';

export function towerAssetSrc(towerId: string): string {
	return `assets/towers/${towerId}-runtime.webp?v=${TOWER_ASSET_VERSION}`;
}

interface TowerIconProps {
	towerId: string;
	size?: number;
	className?: string;
}

/**
 * Minimal tower sprite resolver — looks up runtime-sized tower WebP assets.
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
			src={towerAssetSrc(towerId)}
			alt=""
			width={size}
			height={size}
			className={className}
			style={{ imageRendering: 'pixelated' }}
			onError={() => setFailed(true)}
		/>
	);
}
