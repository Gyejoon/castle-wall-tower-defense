import { ALL_TOWERS } from './towers';

/** GDD 11-3 확률 테이블 */
const TIER_WEIGHTS = [
  { tier: 1, weight: 40, name: '일반' },
  { tier: 2, weight: 35, name: '레어' },
  { tier: 3, weight: 18, name: '유니크' },
  { tier: 4, weight: 6, name: '에픽' },
  { tier: 5, weight: 1, name: '전설' },
];

const TOTAL_WEIGHT = TIER_WEIGHTS.reduce((s, w) => s + w.weight, 0);

export const PITY_THRESHOLD = 50;

export interface GachaResult {
  towerId: string;
  towerName: string;
  tier: number;
  isPityReward: boolean;
}

export function rollGacha(
  pityCount: number,
  ownedTowerIds: string[],
  rng = Math.random,
): { result: GachaResult; newPityCount: number } {
  // 천장: 50연속 tier4 이하 → tier5 확정
  const forceTier5 = pityCount >= PITY_THRESHOLD;

  let targetTier: number;
  if (forceTier5) {
    targetTier = 5;
  } else {
    const roll = rng() * TOTAL_WEIGHT;
    let cumulative = 0;
    targetTier = 1;
    for (const w of TIER_WEIGHTS) {
      cumulative += w.weight;
      if (roll < cumulative) {
        targetTier = w.tier;
        break;
      }
    }
  }

  // Amendment B: 빈 candidates 가드
  let candidates = ALL_TOWERS.filter((t) => t.tier === targetTier);
  if (candidates.length === 0) {
    // fallback: tier 1
    candidates = ALL_TOWERS.filter((t) => t.tier === 1);
  }
  const tower = candidates[Math.floor(rng() * candidates.length)];

  const newPityCount = targetTier >= 5 ? 0 : pityCount + 1;

  return {
    result: {
      towerId: tower.id,
      towerName: tower.name,
      tier: tower.tier,
      isPityReward: forceTier5,
    },
    newPityCount,
  };
}

/** 10연차: tier3+ 1개 보장 */
export function rollGacha10(
  pityCount: number,
  ownedTowerIds: string[],
  rng = Math.random,
): { results: GachaResult[]; newPityCount: number } {
  const results: GachaResult[] = [];
  let currentPity = pityCount;

  for (let i = 0; i < 10; i++) {
    const { result, newPityCount } = rollGacha(currentPity, ownedTowerIds, rng);
    results.push(result);
    currentPity = newPityCount;
  }

  // 10연차 보장: tier3+ 없으면 마지막을 tier3로 재롤
  const hasTier3Plus = results.some((r) => r.tier >= 3);
  if (!hasTier3Plus) {
    const tier3Candidates = ALL_TOWERS.filter((t) => t.tier === 3);
    const replacement = tier3Candidates[Math.floor(rng() * tier3Candidates.length)];
    results[9] = {
      towerId: replacement.id,
      towerName: replacement.name,
      tier: replacement.tier,
      isPityReward: false,
    };
    // Amendment C: 교체된 타워의 tier가 5 이상이면 pity 리셋
    if (replacement.tier >= 5) {
      currentPity = 0;
    }
  }

  return { results, newPityCount: currentPity };
}

export const GACHA_COSTS = {
  free: { diamond: 0, cooldownMs: 24 * 60 * 60 * 1000 },
  ad: { diamond: 0, cooldownMs: 8 * 60 * 60 * 1000, dailyLimit: 3 },
  diamond_single: { diamond: 100 },
  diamond_ten: { diamond: 900 },
} as const;
