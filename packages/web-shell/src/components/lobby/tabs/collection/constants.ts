import type { ElementType } from '@gld/shared';

export const ELEMENT_COLORS: Record<ElementType, string> = {
	fire: '#c03020',
	water: '#5bc8e8',
	lightning: '#f0d060',
	neutral: '#a09070',
};

export const ELEMENT_NAMES: Record<ElementType, string> = {
	fire: '화염',
	water: '냉기',
	lightning: '번개',
	neutral: '무속성',
};

export const TIER_DOT_KEYS = [1, 2, 3, 4, 5, 6] as const;

export function translateSpecial(special: string): string {
	return special
		.replace(/splash_([\d.]+)/g, '범위 공격 $1')
		.replace(/slow_(\d+)%/g, '감속 $1%')
		.replace(/stun_(\d+)ms/g, '기절 $1ms')
		.replace(/splash/g, '범위 공격')
		.replace(/slow/g, '감속')
		.replace(/stun/g, '기절');
}
