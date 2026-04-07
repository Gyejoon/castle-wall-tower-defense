import type { ElementType, TowerGrade } from '@gld/shared';
import { colors } from '../../../../styles/tokens';

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

export const GRADE_BORDER: Record<TowerGrade, string> = {
	normal: colors.border,
	rare: '#5bc8e8',
	unique: '#9060e0',
	epic: '#f0d060',
};

export const TIER_DOT_KEYS = [1, 2, 3, 4, 5] as const;

export function translateSpecial(special: string): string {
	return special
		.replace(/splash/g, '범위 공격')
		.replace(/slow_(\d+)%_aoe/g, '광역 감속 $1%')
		.replace(/slow_(\d+)%/g, '감속 $1%')
		.replace(/stun_aoe_global/g, '전역 기절')
		.replace(/stun_aoe_extended/g, '광역 기절(강화)')
		.replace(/stun_aoe/g, '광역 기절')
		.replace(/stun/g, '기절');
}
