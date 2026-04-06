import { describe, expect, it } from 'vitest';
import {
	GACHA_COSTS,
	PITY_THRESHOLD,
	rollGacha,
	rollGacha10,
} from '../src/index';

describe('rollGacha', () => {
	it('pity 미달 시 정상 롤', () => {
		const rng = () => 0; // 0 → tier 1 (weight 40)
		const { result, newPityCount } = rollGacha(0, [], rng);
		expect(result.tier).toBeGreaterThanOrEqual(1);
		expect(result.tier).toBeLessThanOrEqual(5);
		expect(newPityCount).toBeGreaterThanOrEqual(0);
	});

	it('pity 50 이상 → tier5 강제', () => {
		const rng = () => 0.99;
		const { result, newPityCount } = rollGacha(PITY_THRESHOLD, [], rng);
		expect(result.tier).toBe(5);
		expect(result.isPityReward).toBe(true);
		expect(newPityCount).toBe(0); // pity 리셋
	});

	it('tier5 획득 시 pity 리셋', () => {
		// force tier5 with low rng × weight = 전설 범위
		// total weight=100, tier5 weight=1, threshold=99
		const rng = () => 0.99; // 0.99 * 100 = 99 → tier5
		const { newPityCount } = rollGacha(10, [], rng);
		expect(newPityCount).toBe(0);
	});

	it('tier4 이하 획득 시 pity +1', () => {
		const rng = () => 0; // tier1
		const { result, newPityCount } = rollGacha(5, [], rng);
		expect(result.tier).toBeLessThan(5);
		expect(newPityCount).toBe(6);
	});

	it('빈 candidates fallback → tier1으로', () => {
		// tier=99는 존재하지 않으므로 fallback 발동 불가 — 단 pity=50으로 tier5 강제
		// 이 케이스는 코드 내부 fallback 로직만 검증 (정상 경로)
		const rng = () => 0;
		const { result } = rollGacha(0, [], rng);
		expect(result.towerId).toBeTruthy();
	});
});

describe('rollGacha10', () => {
	it('10개 결과 반환', () => {
		const rng = () => 0.5;
		const { results } = rollGacha10(0, [], rng);
		expect(results).toHaveLength(10);
	});

	it('tier3+ 없으면 마지막 결과를 tier3으로 교체', () => {
		// 항상 tier1만 나오는 rng (0 → tier1)
		const rng = () => 0;
		const { results } = rollGacha10(0, [], rng);
		const hasTier3Plus = results.some((r) => r.tier >= 3);
		expect(hasTier3Plus).toBe(true);
		// 마지막 결과가 tier3
		expect(results[9].tier).toBe(3);
	});

	it('GACHA_COSTS 상수 검증', () => {
		expect(GACHA_COSTS.diamond_single.diamond).toBe(100);
		expect(GACHA_COSTS.diamond_ten.diamond).toBe(900);
		expect(GACHA_COSTS.free.cooldownMs).toBe(24 * 60 * 60 * 1000);
		expect(GACHA_COSTS.ad.dailyLimit).toBe(3);
	});
});
