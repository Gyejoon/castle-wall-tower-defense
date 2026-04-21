export const fontFamily = {
	pixel: "'Galmuri11', 'Press Start 2P', cursive",
	display: "'Press Start 2P', 'Galmuri11', cursive",
} as const;

export const fontWeight = {
	regular: 400,
	bold: 700,
} as const;

// lineHeight은 font-size에 곱해지는 무단위 배수.
export const typography = {
	display40: {
		family: fontFamily.display,
		size: '40px',
		lineHeight: 1.1,
		weight: fontWeight.bold,
	},
	display32: {
		family: fontFamily.display,
		size: '32px',
		lineHeight: 1.15,
		weight: fontWeight.bold,
	},
	h1: {
		family: fontFamily.pixel,
		size: '24px',
		lineHeight: 1.25,
		weight: fontWeight.bold,
	},
	h2: {
		family: fontFamily.pixel,
		size: '20px',
		lineHeight: 1.3,
		weight: fontWeight.bold,
	},
	body16: {
		family: fontFamily.pixel,
		size: '16px',
		lineHeight: 1.4,
		weight: fontWeight.regular,
	},
	body14: {
		family: fontFamily.pixel,
		size: '14px',
		lineHeight: 1.4,
		weight: fontWeight.regular,
	},
	label12: {
		family: fontFamily.pixel,
		size: '12px',
		lineHeight: 1.2,
		weight: fontWeight.bold,
	},
	caption10: {
		family: fontFamily.pixel,
		size: '10px',
		lineHeight: 1.2,
		weight: fontWeight.regular,
	},
} as const;

export type TypographyScale = keyof typeof typography;
