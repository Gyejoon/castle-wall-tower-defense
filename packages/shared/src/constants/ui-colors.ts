/**
 * UI color palette shared across React (DOM) and Phaser (Canvas).
 * Phaser uses 0x-prefixed number format; React uses hex strings.
 *
 * NOTE: This file is a backwards-compatibility adapter.
 * The real source of truth is `packages/shared/src/design/palette.ts`.
 * New code should import `core` / `palette` from `@gld/shared` directly.
 */

import { core } from '../design/palette';

export const UI_COLORS = {
	bg: core.bg,
	panel: core.panel,
	border: core.border,
	accent: core.accent,
	success: core.success,
	danger: core.danger,
	gold: core.gold,
	info: core.info,
	text: core.text,
	textSecondary: core.textSecondary,
	gradeUnique: core.gradeUnique,
	tierBright: core.tierBright,
	bossPhase1: core.bossPhase1,
	armorPierce: core.armorPierce,
} as const;

/** Convert a `#rrggbb` hex string to Phaser's `0xrrggbb` number format */
const toHexNumber = (hex: string): number => Number.parseInt(hex.slice(1), 16);

/** Same palette as UI_COLORS but in Phaser-compatible 0x number format */
export const PHASER_COLORS = {
	bg: toHexNumber(core.bg),
	panel: toHexNumber(core.panel),
	border: toHexNumber(core.border),
	accent: toHexNumber(core.accent),
	success: toHexNumber(core.success),
	danger: toHexNumber(core.danger),
	gold: toHexNumber(core.gold),
	info: toHexNumber(core.info),
	text: toHexNumber(core.text),
	textSecondary: toHexNumber(core.textSecondary),
	gradeUnique: toHexNumber(core.gradeUnique),
	tierBright: toHexNumber(core.tierBright),
	bossPhase1: toHexNumber(core.bossPhase1),
	armorPierce: toHexNumber(core.armorPierce),
} as const;
