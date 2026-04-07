/** Pixel-art currency icons — replaces emoji for cross-platform consistency */

export function DiamondIcon({ size = 12 }: { size?: number }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 12 12"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden="true"
		>
			<path d="M6 1L2 5L6 11L10 5L6 1Z" fill="#5bc8e8" />
			<path d="M6 1L2 5L6 6L10 5L6 1Z" fill="#8dd8f0" />
			<path d="M4 5L6 6L6 11L4 5Z" fill="#3ab0d8" />
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
		>
			<circle cx="6" cy="6" r="5" fill="#f0d060" />
			<circle cx="6" cy="6" r="3.5" fill="#c8a04a" />
			<circle cx="6" cy="6" r="2" fill="#f0d060" />
		</svg>
	);
}
