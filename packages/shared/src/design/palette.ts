// 이 파일이 모든 색상의 단일 원본. 다른 곳에 hex 리터럴 추가 금지.
export const core = {
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
	armorPierce: '#a0a8b0',
} as const;

export const state = {
	hover: '#e0b860',
	focus: '#ffcf66',
	disabledFg: 'rgba(240, 232, 216, 0.4)',
	disabledBg: 'rgba(74, 58, 32, 0.5)',
	warning: '#c88c40',
	pressed: '#7a5a10',
} as const;

export const element = {
	fire: { primary: '#e74c3c', glow: '#ff6b4a' },
	water: { primary: '#3498db', glow: '#5dade2' },
	lightning: { primary: '#f39c12', glow: '#f7b731' },
	earth: { primary: '#8b6a40', glow: '#b8956a' },
	neutral: { primary: '#c8a04a', glow: '#f0d060' },
} as const;

export const tier = {
	1: { primary: '#c8a04a', dark: '#8b6a2a', bright: '#e0b860' },
	2: { primary: '#5bc8e8', dark: '#3a90b0', bright: '#80d8f0' },
	3: { primary: '#c040d0', dark: '#8020a0', bright: '#d880e8' },
	4: { primary: '#e04040', dark: '#a02020', bright: '#f06060' },
	5: { primary: '#f0d060', dark: '#c0a030', bright: '#ffe89a' },
	6: { primary: '#ff6b4a', dark: '#c04020', bright: '#ff9070' },
} as const;

export const surface = {
	bg: core.bg,
	panel: core.panel,
	panelElevated: '#352818',
	panelSunken: '#1f1608',
	alpha: {
		bg76: 'rgba(26, 18, 8, 0.76)',
		bg80: 'rgba(26, 18, 8, 0.8)',
		bg95: 'rgba(26, 18, 8, 0.95)',
		panel70: 'rgba(42, 32, 16, 0.7)',
		panel85: 'rgba(42, 32, 16, 0.85)',
		panel90: 'rgba(42, 32, 16, 0.9)',
		panel92: 'rgba(42, 32, 16, 0.92)',
		panel95: 'rgba(42, 32, 16, 0.95)',
		panel96: 'rgba(42, 32, 16, 0.96)',
		overlay60: 'rgba(0, 0, 0, 0.6)',
		overlay70: 'rgba(0, 0, 0, 0.7)',
		overlayDark: 'rgba(10, 8, 4, 0.82)',
		overlayHeavy: 'rgba(10, 8, 4, 0.92)',
		danger20: 'rgba(192, 48, 32, 0.2)',
		accent20: 'rgba(200, 160, 74, 0.2)',
	},
} as const;

export const palette = {
	core,
	state,
	element,
	tier,
	surface,
} as const;

export type CoreColor = keyof typeof core;
export type StateColor = keyof typeof state;
export type ElementKey = keyof typeof element;
export type TierKey = keyof typeof tier;
