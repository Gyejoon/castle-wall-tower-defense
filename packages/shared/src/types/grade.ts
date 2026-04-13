export const GRADES = ['normal', 'rare', 'unique', 'epic'] as const;
export type Grade = (typeof GRADES)[number];

export function nextGrade(grade: Grade): Grade | null {
	const idx = GRADES.indexOf(grade);
	if (idx < 0 || idx >= GRADES.length - 1) return null;
	return GRADES[idx + 1];
}

export function isMaxGrade(grade: Grade): boolean {
	return grade === 'epic';
}
