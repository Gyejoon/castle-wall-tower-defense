// packages/shared/src/constants/achievements.ts

export interface AchievementDef {
	id: string;
	category: 'combat_power' | 'level' | 'tower' | 'progress';
	name: string;
	description: string;
	target: number;
	reward: { diamond: number };
}

export const ACHIEVEMENTS: AchievementDef[] = [
	// 전투력 (~6개)
	{ id: 'cp_100', category: 'combat_power', name: '초보 지휘관', description: '전투력 100 달성', target: 100, reward: { diamond: 50 } },
	{ id: 'cp_500', category: 'combat_power', name: '숙련 지휘관', description: '전투력 500 달성', target: 500, reward: { diamond: 100 } },
	{ id: 'cp_1000', category: 'combat_power', name: '정예 지휘관', description: '전투력 1,000 달성', target: 1000, reward: { diamond: 200 } },
	{ id: 'cp_5000', category: 'combat_power', name: '영웅 지휘관', description: '전투력 5,000 달성', target: 5000, reward: { diamond: 500 } },
	{ id: 'cp_10000', category: 'combat_power', name: '전설의 지휘관', description: '전투력 10,000 달성', target: 10000, reward: { diamond: 800 } },
	{ id: 'cp_50000', category: 'combat_power', name: '신의 지휘관', description: '전투력 50,000 달성', target: 50000, reward: { diamond: 2000 } },

	// 레벨 (~5개)
	{ id: 'lv_5', category: 'level', name: '입문자', description: '레벨 5 달성', target: 5, reward: { diamond: 30 } },
	{ id: 'lv_10', category: 'level', name: '수련생', description: '레벨 10 달성', target: 10, reward: { diamond: 50 } },
	{ id: 'lv_20', category: 'level', name: '기사', description: '레벨 20 달성', target: 20, reward: { diamond: 100 } },
	{ id: 'lv_50', category: 'level', name: '대기사', description: '레벨 50 달성', target: 50, reward: { diamond: 300 } },
	{ id: 'lv_99', category: 'level', name: '왕의 수호자', description: '레벨 99 달성', target: 99, reward: { diamond: 1000 } },

	// 타워 (~6개)
	{ id: 'tower_lv10', category: 'tower', name: '첫 강화', description: '타워 Lv.10 달성', target: 10, reward: { diamond: 30 } },
	{ id: 'tower_lv30', category: 'tower', name: '정련의 탑', description: '타워 Lv.30 달성', target: 30, reward: { diamond: 100 } },
	{ id: 'tower_lv50', category: 'tower', name: '극한 강화', description: '타워 Lv.50 달성', target: 50, reward: { diamond: 200 } },
	{ id: 'tower_rare', category: 'tower', name: '첫 승급', description: '타워 Rare 등급 달성', target: 1, reward: { diamond: 50 } },
	{ id: 'tower_unique', category: 'tower', name: '유니크 달성', description: '타워 Unique 등급 달성', target: 1, reward: { diamond: 200 } },
	{ id: 'tower_epic', category: 'tower', name: '에픽 달성', description: '타워 Epic 등급 달성', target: 1, reward: { diamond: 500 } },

	// 진행 (~7개)
	{ id: 'clear_1', category: 'progress', name: '첫 승리', description: '스테이지 1회 클리어', target: 1, reward: { diamond: 30 } },
	{ id: 'clear_10', category: 'progress', name: '숙련 수비대장', description: '스테이지 10회 클리어', target: 10, reward: { diamond: 100 } },
	{ id: 'clear_50', category: 'progress', name: '베테랑', description: '스테이지 50회 클리어', target: 50, reward: { diamond: 300 } },
	{ id: 'boss_10', category: 'progress', name: '보스 헌터', description: '보스 10회 격파', target: 10, reward: { diamond: 100 } },
	{ id: 'boss_100', category: 'progress', name: '보스 슬레이어', description: '보스 100회 격파', target: 100, reward: { diamond: 500 } },
	{ id: 'star2_all', category: 'progress', name: '정예 정복자', description: '모든 스테이지 ★2 클리어', target: 3, reward: { diamond: 500 } },
	{ id: 'star3_all', category: 'progress', name: '지옥 정복자', description: '모든 스테이지 ★3 클리어', target: 3, reward: { diamond: 2000 } },
];

export const ACHIEVEMENT_MAP = Object.fromEntries(
	ACHIEVEMENTS.map((a) => [a.id, a]),
) as Record<string, AchievementDef>;
