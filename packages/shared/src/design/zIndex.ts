// 저→고: board / hud / floating / overlay / modal / toast. 원시 z-[N] 리터럴 금지.
export const zIndex = {
	board: 0,
	hud: 10,
	floating: 20,
	overlay: 30,
	modal: 40,
	toast: 50,
} as const;

export type ZIndexKey = keyof typeof zIndex;
