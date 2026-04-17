import { describe, expect, it } from 'vitest';
import { GRADES, isMaxGrade, nextGrade } from '../src/types/grade';

describe('grade', () => {
	it('GRADES는 4단계 — normal → rare → unique → epic', () => {
		expect(GRADES).toEqual(['normal', 'rare', 'unique', 'epic']);
	});

	it('nextGrade는 한 단계 위 등급을 반환', () => {
		expect(nextGrade('normal')).toBe('rare');
		expect(nextGrade('rare')).toBe('unique');
		expect(nextGrade('unique')).toBe('epic');
	});

	it('nextGrade(epic)은 null — 더 이상 합성 불가', () => {
		expect(nextGrade('epic')).toBeNull();
	});

	it('isMaxGrade는 epic만 true', () => {
		expect(isMaxGrade('epic')).toBe(true);
		expect(isMaxGrade('unique')).toBe(false);
		expect(isMaxGrade('normal')).toBe(false);
	});
});
