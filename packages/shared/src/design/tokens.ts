export type { ElevationKey, OverlayDimKey } from './elevation';
export { elevation, overlayDim } from './elevation';
export type { DurationKey, EasingKey } from './motion';
export { duration, easing, motion } from './motion';
export type { CoreColor, ElementKey, StateColor, TierKey } from './palette';
export { core, element, palette, state, surface, tier } from './palette';
export type { RadiusKey } from './radius';
export { radius } from './radius';
export type { SpacingKey } from './spacing';
export { spacing } from './spacing';
export type { TypographyScale } from './typography';
export { fontFamily, fontWeight, typography } from './typography';
export type { ZIndexKey } from './zIndex';
export { zIndex } from './zIndex';

import { elevation, overlayDim } from './elevation';
import { motion } from './motion';
import { palette } from './palette';
import { radius } from './radius';
import { spacing } from './spacing';
import { fontFamily, typography } from './typography';
import { zIndex } from './zIndex';

export const tokens = {
	palette,
	typography,
	fontFamily,
	spacing,
	radius,
	elevation,
	overlayDim,
	zIndex,
	motion,
} as const;

export type Tokens = typeof tokens;
