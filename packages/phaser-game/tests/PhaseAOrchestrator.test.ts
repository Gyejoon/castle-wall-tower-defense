import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mini routing EventBus mock — emit() actually fires registered handlers
// so the orchestrator's request→handle→emit roundtrip is testable.
const { EventBus, getEmits, resetBus } = vi.hoisted(() => {
	const handlers = new Map<string, Set<(payload?: unknown) => void>>();
	const emit = vi.fn((event: string, payload?: unknown) => {
		const set = handlers.get(event);
		if (set) {
			for (const fn of set) fn(payload);
		}
	});
	return {
		EventBus: {
			emit,
			on: (event: string, fn: (payload?: unknown) => void) => {
				if (!handlers.has(event)) handlers.set(event, new Set());
				handlers.get(event)?.add(fn);
			},
			off: (event: string, fn: (payload?: unknown) => void) => {
				handlers.get(event)?.delete(fn);
			},
		},
		getEmits: () => emit.mock.calls,
		resetBus: () => {
			handlers.clear();
			emit.mockClear();
		},
	};
});

vi.mock('../src/EventBus', () => ({ EventBus }));

import { PhaseAOrchestrator } from '../src/systems/PhaseAOrchestrator';

interface FakeTower {
	col: number;
	row: number;
	towerId: string;
	family: string;
	tier: number;
	instanceId: string;
}

// Minimal family/tier table for test towers so merge logic resolves.
const TEST_FAMILY: Record<string, { family: string; tier: number }> = {
	archer: { family: 'archer', tier: 1 },
	wind_spire: { family: 'archer', tier: 2 },
	nova_cannon: { family: 'siege', tier: 1 },
};

function makeFakeTowerSystem() {
	const towers: FakeTower[] = [];
	let nextId = 0;
	return {
		towers,
		playPhaseASummonVfx: vi.fn(),
		playPhaseAMergeVfx: vi.fn(),
		playMergeRevealVfx: vi.fn(),
		placeTower: vi.fn((col: number, row: number, defId: string) => {
			const meta = TEST_FAMILY[defId] ?? { family: 'archer', tier: 1 };
			const instanceId = `fake_${nextId++}`;
			towers.push({
				col,
				row,
				towerId: defId,
				family: meta.family,
				tier: meta.tier,
				instanceId,
			});
			return { success: true, tower: { instanceId } };
		}),
		getTowerLocator: vi.fn((col: number, row: number) => {
			const t = towers.find((x) => x.col === col && x.row === row);
			return t
				? {
						instanceId: t.instanceId,
						towerId: t.towerId,
						family: t.family,
						tier: t.tier,
						x: col,
						y: row,
					}
				: null;
		}),
		getTowerAt: vi.fn((col: number, row: number) => {
			const t = towers.find((x) => x.col === col && x.row === row);
			return t
				? {
						data: { instanceId: t.instanceId, defId: t.towerId },
						def: { id: t.towerId, tier: t.tier },
						tier: t.tier,
					}
				: null;
		}),
		removeTowerAt: vi.fn((col: number, row: number) => {
			const i = towers.findIndex((x) => x.col === col && x.row === row);
			if (i < 0) return false;
			towers.splice(i, 1);
			return true;
		}),
	};
}

function makeFakeEnergy(initial = 100) {
	let energy = initial;
	return {
		canAfford: vi.fn((cost: number) => energy >= cost),
		spend: vi.fn((cost: number) => {
			if (energy < cost) return false;
			energy -= cost;
			return true;
		}),
		add: vi.fn((amount: number) => {
			energy += amount;
		}),
		get current() {
			return energy;
		},
	};
}

beforeEach(() => {
	resetBus();
});

describe('PhaseAOrchestrator (Phase 1 — merge stubbed)', () => {
	it('request-summon-tower → draw from pool → emit phase-a-summon-ready (towerId only)', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
		});

		EventBus.emit('request-summon-tower');

		expect(orch.hasPendingSummon()).toBe(true);
		expect(towerSystem.placeTower).not.toHaveBeenCalled();
		const readyCall = getEmits().find(
			([event]) => event === 'phase-a-summon-ready',
		);
		expect(readyCall?.[1]).toEqual({ towerId: 'archer', source: 'summon' });

		orch.destroy();
	});

	it('completePlacement → placeTower + tower-summoned (no grade)', () => {
		const towerSystem = makeFakeTowerSystem();
		const energy = makeFakeEnergy(40);
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
			energySystem: energy,
			summonCost: 8,
		});

		EventBus.emit('request-summon-tower');
		orch.completePlacement(2, 3);

		expect(towerSystem.placeTower).toHaveBeenCalledWith(2, 3, 'archer', {
			levelOverride: 1,
		});
		expect(energy.spend).toHaveBeenCalledWith(8);
		expect(orch.hasPendingSummon()).toBe(false);
		const summoned = getEmits().find(([e]) => e === 'tower-summoned');
		expect(summoned?.[1]).toMatchObject({ col: 2, row: 3, towerId: 'archer' });
		// grade is gone
		expect((summoned?.[1] as Record<string, unknown>).grade).toBeUndefined();
	});

	it('cancelPendingSummon clears pending state', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
		});

		EventBus.emit('request-summon-tower');
		expect(orch.hasPendingSummon()).toBe(true);
		orch.cancelPendingSummon();
		expect(orch.hasPendingSummon()).toBe(false);
	});

	it('merge request → archer+archer (T1) 성공 시 towers-merged(wind_spire, T2) emit', () => {
		const towerSystem = makeFakeTowerSystem();
		towerSystem.placeTower(0, 0, 'archer');
		towerSystem.placeTower(1, 0, 'archer');
		new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
		});

		EventBus.emit('request-merge-towers', {
			fromCol: 0,
			fromRow: 0,
			toCol: 1,
			toRow: 0,
		});

		expect(towerSystem.removeTowerAt).toHaveBeenCalledWith(0, 0);
		expect(towerSystem.removeTowerAt).toHaveBeenCalledWith(1, 0);
		expect(towerSystem.placeTower).toHaveBeenLastCalledWith(
			1,
			0,
			'wind_spire',
			{ levelOverride: 1 },
		);
		const mergedCall = getEmits().find(([event]) => event === 'towers-merged');
		expect(mergedCall?.[1]).toMatchObject({
			col: 1,
			row: 0,
			towerId: 'wind_spire',
			toTowerId: 'wind_spire',
			fromTier: 1,
			toTier: 2,
		});
	});

	it('merge request → 가족이 다르면 incompatible-pair 실패', () => {
		const towerSystem = makeFakeTowerSystem();
		towerSystem.placeTower(0, 0, 'archer');
		towerSystem.placeTower(1, 0, 'nova_cannon');
		new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
		});

		EventBus.emit('request-merge-towers', {
			fromCol: 0,
			fromRow: 0,
			toCol: 1,
			toRow: 0,
		});

		const failedCall = getEmits().find(([event]) => event === 'merge-failed');
		expect(failedCall?.[1]).toMatchObject({ reason: 'incompatible-pair' });
		expect(towerSystem.removeTowerAt).not.toHaveBeenCalled();
	});

	it('merge request → 빈 타일이면 invalid-tile 실패', () => {
		const towerSystem = makeFakeTowerSystem();
		new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
		});

		EventBus.emit('request-merge-towers', {
			fromCol: 0,
			fromRow: 0,
			toCol: 1,
			toRow: 0,
		});

		const failedCall = getEmits().find(([event]) => event === 'merge-failed');
		expect(failedCall?.[1]).toMatchObject({ reason: 'invalid-tile' });
	});

	it('destroy() 후 emit이 더 이상 핸들러를 부르지 않는다', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
		});

		orch.destroy();
		EventBus.emit('request-summon-tower');
		EventBus.emit('request-merge-towers', {
			fromCol: 0,
			fromRow: 0,
			toCol: 1,
			toRow: 0,
		});

		expect(towerSystem.placeTower).not.toHaveBeenCalled();
	});

	it('에너지 부족이면 summon-failed:insufficient-energy emit + placeTower 미호출', () => {
		const towerSystem = makeFakeTowerSystem();
		const energy = makeFakeEnergy(0);
		new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
			energySystem: energy,
			summonCost: 8,
		});

		EventBus.emit('request-summon-tower');

		expect(energy.canAfford).toHaveBeenCalledWith(8);
		expect(energy.spend).not.toHaveBeenCalled();
		expect(towerSystem.placeTower).not.toHaveBeenCalled();
		const failed = getEmits().find(([event]) => event === 'summon-failed');
		expect(failed?.[1]).toEqual({ reason: 'insufficient-energy' });
	});

	it('에너지 충분 시 draw 성공 → completePlacement 후 spend + tower-summoned', () => {
		const towerSystem = makeFakeTowerSystem();
		const energy = makeFakeEnergy(40);
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
			energySystem: energy,
			summonCost: 8,
		});

		EventBus.emit('request-summon-tower');
		expect(towerSystem.placeTower).not.toHaveBeenCalled();
		expect(energy.spend).not.toHaveBeenCalled();

		orch.completePlacement(1, 1);
		expect(towerSystem.placeTower).toHaveBeenCalledTimes(1);
		expect(energy.spend).toHaveBeenCalledWith(8);
		expect(energy.current).toBe(32);
	});

	it('destroy()를 두 번 불러도 안전', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
		});
		orch.destroy();
		expect(() => orch.destroy()).not.toThrow();
	});

	it('applyUpgrade → activeUpgrades 스택 증가 + upgrade-applied emit', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
		});

		orch.applyUpgrade('dmg_up');
		expect(orch.getUpgradeStacks('dmg_up')).toBe(1);

		orch.applyUpgrade('dmg_up');
		expect(orch.getUpgradeStacks('dmg_up')).toBe(2);

		orch.destroy();
	});

	it('getModifier — dmg_up multiply: 1회=1.20, 2회=1.44', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
		});

		expect(orch.getModifier('dmg_up')).toBe(1);
		orch.applyUpgrade('dmg_up');
		expect(orch.getModifier('dmg_up')).toBeCloseTo(1.2);
		orch.applyUpgrade('dmg_up');
		expect(orch.getModifier('dmg_up')).toBeCloseTo(1.44);
		orch.destroy();
	});

	it('effectiveSummonCost — Phase 4에서는 상수(할인 카드 제거됨)', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			summonCost: 8,
		});

		expect(orch.effectiveSummonCost).toBe(8);
		orch.destroy();
	});

	it('applyUpgrade는 UPGRADE_MAX_STACKS(10)에서 포화', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
		});

		for (let i = 0; i < 15; i++) orch.applyUpgrade('tier_odds_up');
		expect(orch.getUpgradeStacks('tier_odds_up')).toBe(10);
		orch.destroy();
	});

	it('알 수 없는 upgradeId는 무시된다', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
		});

		orch.applyUpgrade('nonexistent_card');
		expect(orch.getUpgradeStacks('nonexistent_card')).toBe(0);
		orch.destroy();
	});

	it('requestUpgradePick → upgrade-choice-ready 이벤트 { choices } 발행', () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
		});

		orch.requestUpgradePick(3);

		const ready = getEmits().find(([e]) => e === 'upgrade-choice-ready');
		expect(ready).toBeDefined();
		const payload = ready?.[1] as { choices: Array<{ id: string }> };
		expect(payload.choices).toHaveLength(3);
		const unique = new Set(payload.choices.map((c) => c.id));
		expect(unique.size).toBe(3);
		orch.destroy();
	});

	it('request-upgrade-reroll (no adService) → 새 upgrade-choice-ready 발행', async () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
		});

		orch.requestUpgradePick(3);
		const firstCount = getEmits().filter(
			([e]) => e === 'upgrade-choice-ready',
		).length;

		EventBus.emit('request-upgrade-reroll');
		await new Promise((r) => setTimeout(r, 0));

		const finalCount = getEmits().filter(
			([e]) => e === 'upgrade-choice-ready',
		).length;
		expect(finalCount).toBeGreaterThan(firstCount);
		orch.destroy();
	});

	// ── Phase 5: GachaSystem + summon queue ──────────────────────────
	it('request-gacha-summon (T2, energy ≥ 40) → spend(40) + phase-a-summon-ready source=gacha', () => {
		const towerSystem = makeFakeTowerSystem();
		const energy = makeFakeEnergy(100);
		new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
			energySystem: energy,
		});

		EventBus.emit('request-gacha-summon', { targetTier: 2 });

		expect(energy.spend).toHaveBeenCalledWith(40);
		const ready = getEmits().find(([e]) => e === 'phase-a-summon-ready');
		expect(ready?.[1]).toMatchObject({ source: 'gacha' });
		expect((ready?.[1] as { towerId: string }).towerId).toBeDefined();
		expect(energy.current).toBe(60);
	});

	it('request-gacha-summon (T2, energy < 40) → gacha-insufficient-energy + no summon', () => {
		const towerSystem = makeFakeTowerSystem();
		const energy = makeFakeEnergy(30);
		new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
			energySystem: energy,
		});

		EventBus.emit('request-gacha-summon', { targetTier: 2 });

		const insufficient = getEmits().find(
			([e]) => e === 'gacha-insufficient-energy',
		);
		expect(insufficient?.[1]).toEqual({ targetTier: 2, cost: 40, have: 30 });
		expect(
			getEmits().find(([e]) => e === 'phase-a-summon-ready'),
		).toBeUndefined();
		expect(energy.current).toBe(30);
	});

	it('gacha during pending summon → queued (no second phase-a-summon-ready)', () => {
		const towerSystem = makeFakeTowerSystem();
		const energy = makeFakeEnergy(200);
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0.1,
			energySystem: energy,
		});

		// First: a regular pool summon → pending.
		EventBus.emit('request-summon-tower');
		expect(orch.hasPendingSummon()).toBe(true);

		// Second: gacha request — should spend energy upfront but NOT emit
		// a new phase-a-summon-ready yet.
		const readyBefore = getEmits().filter(
			([e]) => e === 'phase-a-summon-ready',
		).length;
		EventBus.emit('request-gacha-summon', { targetTier: 2 });
		const readyAfter = getEmits().filter(
			([e]) => e === 'phase-a-summon-ready',
		).length;

		expect(readyAfter).toBe(readyBefore);
		expect(orch.getSummonQueueSize()).toBe(1);
		expect(energy.spend).toHaveBeenCalledWith(40);
	});

	it('cancel pending gacha summon → energy refunded + next queue entry emitted', () => {
		const towerSystem = makeFakeTowerSystem();
		const energy = makeFakeEnergy(200);
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0.1,
			energySystem: energy,
		});

		// Queue two gacha summons — first becomes pending, second queues.
		EventBus.emit('request-gacha-summon', { targetTier: 2 });
		EventBus.emit('request-gacha-summon', { targetTier: 2 });
		expect(orch.hasPendingSummon()).toBe(true);
		expect(orch.getSummonQueueSize()).toBe(1);
		expect(energy.current).toBe(200 - 40 - 40);

		// Cancel current pending — should refund 40 AND surface next queue.
		orch.cancelPendingSummon();

		expect(energy.add).toHaveBeenCalledWith(40);
		expect(energy.current).toBe(200 - 40); // only the queued cost remains
		expect(orch.hasPendingSummon()).toBe(true); // next entry surfaced
		expect(orch.getSummonQueueSize()).toBe(0);
	});

	it('place pending gacha summon → no refund, next queue entry emitted', () => {
		const towerSystem = makeFakeTowerSystem();
		const energy = makeFakeEnergy(200);
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0.1,
			energySystem: energy,
		});

		EventBus.emit('request-gacha-summon', { targetTier: 2 });
		EventBus.emit('request-gacha-summon', { targetTier: 2 });
		expect(orch.getSummonQueueSize()).toBe(1);

		// Placement should succeed without a second spend (gacha paid upfront).
		const spendCallsBefore = energy.spend.mock.calls.length;
		orch.completePlacement(0, 0);
		const spendCallsAfter = energy.spend.mock.calls.length;

		expect(spendCallsAfter).toBe(spendCallsBefore); // no new spend
		expect(energy.add).not.toHaveBeenCalled(); // no refund
		expect(orch.hasPendingSummon()).toBe(true); // next entry surfaced
		expect(orch.getSummonQueueSize()).toBe(0);
	});

	it('rapid-tap gacha T2 x3 with energy=40 → one spend, two insufficient, no queueing', () => {
		const towerSystem = makeFakeTowerSystem();
		const energy = makeFakeEnergy(40);
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0.1,
			energySystem: energy,
		});

		EventBus.emit('request-gacha-summon', { targetTier: 2 });
		EventBus.emit('request-gacha-summon', { targetTier: 2 });
		EventBus.emit('request-gacha-summon', { targetTier: 2 });

		// Only one successful spend (the first tap), energy goes to 0.
		expect(energy.current).toBe(0);
		const successfulSpends = energy.spend.mock.results.filter(
			(r) => r.value === true,
		).length;
		expect(successfulSpends).toBe(1);

		// Two insufficient-energy events emitted, no queue entries.
		const insufficientEmits = getEmits().filter(
			([e]) => e === 'gacha-insufficient-energy',
		);
		expect(insufficientEmits.length).toBe(2);
		expect(orch.getSummonQueueSize()).toBe(0);
	});

	it('gacha oddsBonus consumed from getTierOddsBonus()', () => {
		const towerSystem = makeFakeTowerSystem();
		const energy = makeFakeEnergy(1000);
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0.5, // midpoint; without bonus would fail T2 (0.5 > 0.6? no — 0.5 < 0.6 = success)
			energySystem: energy,
		});

		// Stack tier_odds_up to confirm the orchestrator reads the getter.
		// We just verify getTierOddsBonus returns >0 after stacking — the
		// actual probability math is covered by GachaSystem.test.ts.
		orch.applyUpgrade('tier_odds_up');
		expect(orch.getTierOddsBonus()).toBeGreaterThan(0);
	});

	it('request-upgrade-reroll (adService dismissed) → 재발행 안 함', async () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
			adService: {
				watchAd: vi.fn().mockResolvedValue('dismissed'),
			},
		});

		orch.requestUpgradePick(3);
		const firstCount = getEmits().filter(
			([e]) => e === 'upgrade-choice-ready',
		).length;

		EventBus.emit('request-upgrade-reroll');
		await new Promise((r) => setTimeout(r, 0));

		const finalCount = getEmits().filter(
			([e]) => e === 'upgrade-choice-ready',
		).length;
		expect(finalCount).toBe(firstCount);
		orch.destroy();
	});
});

describe('PhaseAOrchestrator — Phase 10 Task 10.3 continue-run pipeline [F11]', () => {
	it('request-continue-run (adService rewarded) → emits game-resumed with livesRestored', async () => {
		const towerSystem = makeFakeTowerSystem();
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
			adService: {
				watchAd: vi.fn().mockResolvedValue('rewarded'),
			},
		});

		EventBus.emit('request-continue-run', { livesRestored: 5 });
		await new Promise((r) => setTimeout(r, 0));

		const resumedEmits = getEmits().filter(([e]) => e === 'game-resumed');
		expect(resumedEmits.length).toBe(1);
		expect(resumedEmits[0][1]).toEqual({ livesRestored: 5 });
		expect(orch.getContinueCount()).toBe(1);
		orch.destroy();
	});

	it('request-continue-run (adService skipped) → no game-resumed, counter rewound for retry', async () => {
		const towerSystem = makeFakeTowerSystem();
		const watchAd = vi.fn().mockResolvedValue('skipped');
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
			adService: { watchAd },
		});

		EventBus.emit('request-continue-run', { livesRestored: 5 });
		await new Promise((r) => setTimeout(r, 0));

		expect(getEmits().filter(([e]) => e === 'game-resumed').length).toBe(0);
		expect(orch.getContinueCount()).toBe(0);
		expect(watchAd).toHaveBeenCalledTimes(1);

		// Retry with a rewarded result should now succeed since the counter
		// was rewound.
		watchAd.mockResolvedValueOnce('rewarded');
		EventBus.emit('request-continue-run', { livesRestored: 5 });
		await new Promise((r) => setTimeout(r, 0));

		expect(getEmits().filter(([e]) => e === 'game-resumed').length).toBe(1);
		expect(orch.getContinueCount()).toBe(1);
		orch.destroy();
	});

	it('request-continue-run beyond cap (PHASE_A_MAX_CONTINUES_PER_RUN) → rejected, no ad call', async () => {
		const towerSystem = makeFakeTowerSystem();
		const watchAd = vi.fn().mockResolvedValue('rewarded');
		const orch = new PhaseAOrchestrator({
			towerSystem: towerSystem as never,
			initialPool: ['archer'],
			rng: () => 0,
			adService: { watchAd },
		});

		// First continue consumes the only slot.
		EventBus.emit('request-continue-run', { livesRestored: 5 });
		await new Promise((r) => setTimeout(r, 0));
		expect(orch.getContinueCount()).toBe(1);
		const firstWatchCallCount = watchAd.mock.calls.length;

		// Second attempt should short-circuit before touching the ad service.
		EventBus.emit('request-continue-run', { livesRestored: 5 });
		await new Promise((r) => setTimeout(r, 0));
		expect(orch.getContinueCount()).toBe(1);
		expect(watchAd.mock.calls.length).toBe(firstWatchCallCount);
		expect(getEmits().filter(([e]) => e === 'game-resumed').length).toBe(1);
		orch.destroy();
	});
});
