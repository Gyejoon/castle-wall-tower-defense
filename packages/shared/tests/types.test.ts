import { describe, expect, it } from 'vitest';
import {
	ALL_TOWERS,
	BASE_TOWERS,
	type CombatHudState,
	DEFAULT_GRID_CONFIG,
	GOD_TOWERS,
	GRID_HEIGHT,
	GRID_WIDTH,
	HEROIC_TOWERS,
	LEGENDARY_TOWERS,
	RARE_TOWERS,
	type WavePhase,
} from '../src/index';

type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;
type Expect<T extends true> = T;

type ExpectedCombatHudState = {
	currentSlot: number;
	phase: WavePhase;
	bossWarning: boolean;
	timerLabel: string;
};

type _CombatHudStateMatchesPveContract = Expect<
	Equal<CombatHudState, ExpectedCombatHudState>
>;

// @ts-expect-error GameToReactEvent was removed from the shared barrel
type RemovedGameToReactEvent = import('../src/index').GameToReactEvent;
// @ts-expect-error ReactToGameEvent was removed from the shared barrel
type RemovedReactToGameEvent = import('../src/index').ReactToGameEvent;
// @ts-expect-error WaveStartedEventPayload was removed from the shared barrel
type RemovedWaveStartedEventPayload =
	import('../src/index').WaveStartedEventPayload;

void (0 as
	| RemovedGameToReactEvent
	| RemovedReactToGameEvent
	| RemovedWaveStartedEventPayload
	| 0);
void (0 as _CombatHudStateMatchesPveContract | 0);

describe('Grid constants', () => {
	it('has valid portrait grid dimensions', () => {
		expect(GRID_WIDTH).toBe(8);
		expect(GRID_HEIGHT).toBe(18);
	});

	it('has portrait spawn and exit within grid bounds', () => {
		const { spawnPoint, exitPoint } = DEFAULT_GRID_CONFIG;
		expect(spawnPoint).toEqual({ x: 3, y: 0 });
		expect(exitPoint).toEqual({ x: 4, y: 17 });
		expect(spawnPoint.x).toBeGreaterThanOrEqual(0);
		expect(spawnPoint.x).toBeLessThan(GRID_WIDTH);
		expect(exitPoint.x).toBeGreaterThanOrEqual(0);
		expect(exitPoint.x).toBeLessThan(GRID_WIDTH);
		expect(spawnPoint.y).toBeGreaterThanOrEqual(0);
		expect(spawnPoint.y).toBeLessThan(GRID_HEIGHT);
		expect(exitPoint.y).toBeGreaterThanOrEqual(0);
		expect(exitPoint.y).toBeLessThan(GRID_HEIGHT);
	});
});

describe('Tower definitions', () => {
	it('preserves the 18-tower pool by tier', () => {
		expect(BASE_TOWERS).toHaveLength(4);
		expect(RARE_TOWERS).toHaveLength(5);
		expect(HEROIC_TOWERS).toHaveLength(4);
		expect(LEGENDARY_TOWERS).toHaveLength(3);
		expect(GOD_TOWERS).toHaveLength(2);
		expect(ALL_TOWERS).toHaveLength(18);
	});

	it('keeps all tower ids unique', () => {
		const ids = ALL_TOWERS.map((tower) => tower.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe('Shared contracts', () => {
	it('uses the PVE-only HUD contract', () => {
		const phases: WavePhase[] = ['combat', 'waiting', 'boss', 'ended'];
		expect(phases).toHaveLength(4);

		const hud: ExpectedCombatHudState = {
			currentSlot: 10,
			phase: 'boss',
			bossWarning: true,
			timerLabel: 'Boss 00:30',
		};

		expect(Object.keys(hud)).toEqual([
			'currentSlot',
			'phase',
			'bossWarning',
			'timerLabel',
		]);
		expect(hud.phase).toBe('boss');
		expect(hud.timerLabel).toContain('Boss');
	});

	it('excludes sudden_death from WavePhase', () => {
		const phases: WavePhase[] = ['combat', 'waiting', 'boss', 'ended'];
		expect(phases).not.toContain('sudden_death');
	});
});
