// 하위 호환 어댑터. 원본은 design/palette.ts. 신규 코드는 core/palette 직접 import.
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

const toHexNumber = (hex: string): number => Number.parseInt(hex.slice(1), 16);

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
