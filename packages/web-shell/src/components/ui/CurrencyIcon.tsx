import { core, element } from '@gld/shared';

export function DiamondIcon({ size = 12 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 12 12"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			style={{ display: 'inline-block', verticalAlign: 'middle' }}
		>
			<path d="M6 1L2 5L6 11L10 5L6 1Z" fill={core.info} />
			<path d="M6 1L2 5L6 6L10 5L6 1Z" fill={element.water.glow} />
			<path d="M4 5L6 6L6 11L4 5Z" fill={element.water.primary} />
		</svg>
	);
}

export function CoinIcon({ size = 12 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 12 12"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
			style={{ display: 'inline-block', verticalAlign: 'middle' }}
		>
			<circle cx="6" cy="6" r="5" fill={core.gold} />
			<circle cx="6" cy="6" r="3.5" fill={core.accent} />
			<circle cx="6" cy="6" r="2" fill={core.gold} />
		</svg>
	);
}
