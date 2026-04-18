import { describe, expect, it } from 'vitest';
import {
	pickRandomUpgrades,
	UPGRADE_CARDS,
	type UpgradeId,
} from '../src/data/upgradeCards';

/**
 * Phase 4 redesign: 6 new cards replace the spd_up/range_up/summon_discount
 * trio. `pickRandomUpgrades` must return DISTINCT cards in a single pick —
 * the overlay never shows duplicates.
 */
describe('upgradeCards — Phase 4 redesign', () => {
	const EXPECTED_IDS: readonly UpgradeId[] = [
		'dmg_up',
		'crit_dmg',
		'energy_harvest',
		'energy_regen',
		'effect_amp',
		'tier_odds_up',
	] as const;

	it('UPGRADE_CARDS는 정확히 6장', () => {
		expect(UPGRADE_CARDS).toHaveLength(6);
	});

	it('새 6장 카드 ID와 순서 확인', () => {
		expect(UPGRADE_CARDS.map((c) => c.id)).toEqual(EXPECTED_IDS);
	});

	it('energy_regen 카드는 주기 메타데이터를 포함 (interval 5000, amount 2)', () => {
		const regen = UPGRADE_CARDS.find((c) => c.id === 'energy_regen');
		expect(regen).toBeDefined();
		expect(regen?.interval).toBe(5000);
		expect(regen?.amount).toBe(2);
	});

	it('모든 카드에 필수 필드가 존재', () => {
		for (const card of UPGRADE_CARDS) {
			expect(card.id).toBeTruthy();
			expect(card.name).toBeTruthy();
			expect(card.description).toBeTruthy();
			expect(card.icon).toBeTruthy();
			expect(['multiply', 'add']).toContain(card.stackType);
			expect(typeof card.value).toBe('number');
		}
	});

	it('pickRandomUpgrades(3, seededRng)는 요청한 수만큼 중복 없이 반환', () => {
		// Simple deterministic rng — cycles 0, 0.33, 0.66
		const values = [0, 0.33, 0.66, 0.1, 0.9, 0.5];
		let i = 0;
		const rng = () => values[i++ % values.length];
		const picks = pickRandomUpgrades(3, rng);
		expect(picks).toHaveLength(3);
		const unique = new Set(picks.map((c) => c.id));
		expect(unique.size).toBe(3);
	});

	it('pickRandomUpgrades는 카드 풀보다 많은 count 요청 시 전체 6장을 반환', () => {
		const picks = pickRandomUpgrades(10);
		expect(picks).toHaveLength(6);
		const unique = new Set(picks.map((c) => c.id));
		expect(unique.size).toBe(6);
	});

	it('pickRandomUpgrades(0) → 빈 배열', () => {
		expect(pickRandomUpgrades(0)).toEqual([]);
	});
});
