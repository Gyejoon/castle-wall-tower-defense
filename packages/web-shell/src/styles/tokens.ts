import { UI_COLORS } from '@gld/shared';

/** Re-export shared palette as `colors` for web-shell inline styles.
 *  Single source of truth: `packages/shared/src/constants/ui-colors.ts` */
export const colors = UI_COLORS;

export const fonts = {
	pixel: "'Galmuri11', 'Press Start 2P', cursive",
} as const;

/** 정규 티어 색상 — 가차 공개 등 강조 맥락에서 사용 */
export const TIER_COLORS: Record<number, string> = {
	1: colors.text,
	2: colors.info,
	3: colors.gradeUnique,
	4: colors.gold,
	5: '#ff6b4a', // legendary — unique tint not in base tokens
};

export const TIER_LABELS: Record<number, string> = {
	1: '일반',
	2: '레어',
	3: '영웅',
	4: '전설',
	5: '신',
};
