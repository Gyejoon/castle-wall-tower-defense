export const colors = {
	bg: '#1a1208',
	panel: '#2a2010',
	border: '#4a3a20',
	accent: '#c8a04a',
	success: '#7ab648',
	danger: '#c03020',
	gold: '#f0d060',
	info: '#5bc8e8',
	text: '#f0e8d8',
	textSecondary: '#a09070',
	gradeUnique: '#9060e0',
	tierBright: '#ffe870',
	bossPhase1: '#c87020',
} as const;

export const fonts = {
	pixel: "'Galmuri11', 'Press Start 2P', cursive",
} as const;

/** 정규 티어 색상 — 가차 공개 등 강조 맥락에서 사용 */
export const TIER_COLORS: Record<number, string> = {
	1: colors.text,
	2: '#5bc8e8',
	3: '#9060e0',
	4: '#f0d060',
	5: '#ff6b4a',
};

export const TIER_LABELS: Record<number, string> = {
	1: '일반',
	2: '레어',
	3: '영웅',
	4: '전설',
	5: '신',
};
