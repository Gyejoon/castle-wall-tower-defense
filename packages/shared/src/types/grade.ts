import { TOWER_GRADES, type TowerGrade } from './save';

export type Grade = TowerGrade;

export const GRADES = TOWER_GRADES;

export function nextGrade(grade: Grade): Grade | null {
	const idx = GRADES.indexOf(grade);
	if (idx < 0 || idx >= GRADES.length - 1) return null;
	return GRADES[idx + 1];
}

export function isMaxGrade(grade: Grade): boolean {
	return grade === 'epic';
}
