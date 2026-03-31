// Tower cards for the collection tab
export interface TowerCard {
  id: string;
  name: string;
  nameKo: string;
  tier: 1 | 2 | 3;
  element: 'fire' | 'ice' | 'lightning' | 'nature' | 'dark';
  description: string;
  owned: boolean;
  attackDamage: number;
  attackSpeed: number;
}

export const MOCK_TOWERS: TowerCard[] = [
  { id: 'fire-1', name: 'Flame Turret', nameKo: '화염 포탑', tier: 1, element: 'fire', description: '기본 화염 공격', owned: true, attackDamage: 10, attackSpeed: 1.0 },
  { id: 'fire-2', name: 'Inferno Tower', nameKo: '인페르노 타워', tier: 2, element: 'fire', description: '범위 화염 공격', owned: true, attackDamage: 25, attackSpeed: 0.8 },
  { id: 'fire-3', name: 'Dragon Spire', nameKo: '용의 첨탑', tier: 3, element: 'fire', description: '최강 화염 타워', owned: false, attackDamage: 60, attackSpeed: 0.6 },
  { id: 'ice-1', name: 'Frost Sentry', nameKo: '서리 파수꾼', tier: 1, element: 'ice', description: '적 이동속도 감소', owned: true, attackDamage: 8, attackSpeed: 1.2 },
  { id: 'ice-2', name: 'Blizzard Keep', nameKo: '눈보라 요새', tier: 2, element: 'ice', description: '범위 빙결', owned: false, attackDamage: 20, attackSpeed: 0.9 },
  { id: 'lightning-1', name: 'Spark Needle', nameKo: '번개 바늘', tier: 1, element: 'lightning', description: '빠른 연쇄 공격', owned: true, attackDamage: 7, attackSpeed: 1.8 },
  { id: 'lightning-2', name: 'Thunder Obelisk', nameKo: '천둥 오벨리스크', tier: 2, element: 'lightning', description: '다중 연쇄 번개', owned: true, attackDamage: 18, attackSpeed: 1.5 },
  { id: 'nature-1', name: 'Vine Trap', nameKo: '덩굴 덫', tier: 1, element: 'nature', description: '적 속박', owned: true, attackDamage: 5, attackSpeed: 0.7 },
  { id: 'nature-2', name: 'Ancient Treant', nameKo: '고대 나무정령', tier: 2, element: 'nature', description: '근접 방어 + 치유', owned: false, attackDamage: 30, attackSpeed: 0.5 },
  { id: 'dark-1', name: 'Shadow Obelisk', nameKo: '그림자 오벨리스크', tier: 1, element: 'dark', description: '관통 공격', owned: true, attackDamage: 12, attackSpeed: 0.9 },
  { id: 'dark-2', name: 'Void Gate', nameKo: '공허의 문', tier: 2, element: 'dark', description: '적 체력 비례 피해', owned: false, attackDamage: 35, attackSpeed: 0.6 },
  { id: 'dark-3', name: 'Abyssal Throne', nameKo: '심연의 왕좌', tier: 3, element: 'dark', description: '주변 타워 강화', owned: false, attackDamage: 50, attackSpeed: 0.4 },
];

// Mock player profile for the lobby
export const MOCK_PROFILE = {
  nickname: '기사단장',
  level: 7,
  exp: 340,
  expToNext: 500,
  trophies: 1250,
  gold: 3200,
  wins: 23,
  losses: 15,
  winRate: 60.5,
  winStreak: 3,
} as const;

// Element color mapping
export const ELEMENT_COLORS: Record<TowerCard['element'], string> = {
  fire: '#c03020',
  ice: '#5bc8e8',
  lightning: '#f0d060',
  nature: '#7ab648',
  dark: '#8a6aaa',
};
