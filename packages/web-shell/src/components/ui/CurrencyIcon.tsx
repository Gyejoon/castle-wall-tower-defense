/**
 * Pixel-art currency icons — replaces emoji for cross-platform consistency.
 * Base colors imported from design tokens. Highlight/shadow tints are derived
 * variants not in the token set.
 */
import { colors } from '../../styles/tokens';

const DIAMOND_HIGHLIGHT = '#8dd8f0';
const DIAMOND_SHADOW = '#3ab0d8';

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
			<path d="M6 1L2 5L6 11L10 5L6 1Z" fill={colors.info} />
			<path d="M6 1L2 5L6 6L10 5L6 1Z" fill={DIAMOND_HIGHLIGHT} />
			<path d="M4 5L6 6L6 11L4 5Z" fill={DIAMOND_SHADOW} />
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
			<circle cx="6" cy="6" r="5" fill={colors.gold} />
			<circle cx="6" cy="6" r="3.5" fill={colors.accent} />
			<circle cx="6" cy="6" r="2" fill={colors.gold} />
		</svg>
	);
}
