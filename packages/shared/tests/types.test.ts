import { describe, expect, it } from 'vitest';
import {
	ALL_TOWERS,
	BASE_TOWERS,
	BOSS_SLOT_AT_SECS,
	type CombatHudState,
	DEFAULT_GRID_CONFIG,
	type GameToReactEvent,
	GOD_TOWERS,
	GRID_HEIGHT,
	GRID_WIDTH,
	HARD_END_AT_SEC,
	HEROIC_TOWERS,
	LEGENDARY_TOWERS,
	PRESSURE_EXPIRES_AT_SEC,
	PRESSURE_LOCK_AT_SEC,
	PRESSURE_TOKEN_CAP,
	RARE_TOWERS,
	SUDDEN_DEATH_AT_SEC,
	type WavePhase,
	type WaveStartedEventPayload,
} from '../src/index';

describe('Grid constants', () => {
	it('has valid grid dimensions', () => {
		expect(GRID_WIDTH).toBe(12);
		expect(GRID_HEIGHT).toBe(8);
	});

	it('has spawn and exit within grid bounds', () => {
		const { spawnPoint, exitPoint } = DEFAULT_GRID_CONFIG;
		expect(spawnPoint.x).toBeGreaterThanOrEqual(0);
		expect(spawnPoint.x).toBeLessThan(GRID_WIDTH);
		expect(exitPoint.x).toBeGreaterThanOrEqual(0);
		expect(exitPoint.x).toBeLessThan(GRID_WIDTH);
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

describe('Match contracts', () => {
	it('uses the new real-time wave phases and HUD state contract', () => {
		const phases: WavePhase[] = ['running', 'boss', 'sudden_death', 'ended'];
		expect(phases).toHaveLength(4);

		const hud: CombatHudState = {
			currentSlot: 10,
			phase: 'boss',
			pressureTokens: 2,
			queuedPressureEffect: 'mixed_pressure',
			buyCooldownMs: 900,
			bossWarning: true,
			suddenDeath: false,
			timerLabel: 'Boss 00:30',
		};

		expect(hud.pressureTokens).toBeLessThanOrEqual(PRESSURE_TOKEN_CAP);
		expect(hud.phase).toBe('boss');
		expect(hud.timerLabel).toContain('Boss');
	});

	it('keeps the documented pressure timing checkpoints aligned', () => {
		expect(PRESSURE_TOKEN_CAP).toBe(2);
		expect(BOSS_SLOT_AT_SECS).toEqual([240, 420]);
		expect(PRESSURE_LOCK_AT_SEC).toBe(535);
		expect(PRESSURE_EXPIRES_AT_SEC).toBe(540);
		expect(SUDDEN_DEATH_AT_SEC).toBe(540);
		expect(HARD_END_AT_SEC).toBe(600);
	});

	it('extends the wave-started payload and new event union for HUD/pressure states', () => {
		const startedPayload: WaveStartedEventPayload = {
			wave: 9,
			totalWaves: 20,
			slotIndex: 10,
			phase: 'running',
			kind: 'normal',
			startAtSec: 270,
		};
		expect(startedPayload.slotIndex).toBe(10);
		expect(startedPayload.phase).toBe('running');

		const events: GameToReactEvent[] = [
			{ type: 'WAVE_STARTED', ...startedPayload },
			{
				type: 'PRESSURE_EARNED',
				ownerId: 'local',
				slotIndex: 10,
				pressureTokens: 1,
				packetId: 'mixed_pressure',
			},
			{
				type: 'PRESSURE_QUEUED',
				ownerId: 'local',
				slotIndex: 10,
				pressureTokens: 0,
				packetId: 'mixed_pressure',
				targetSlotIndex: 11,
			},
			{
				type: 'PRESSURE_EXPIRED',
				ownerId: 'local',
				slotIndex: 19,
				pressureTokens: 0,
				packetId: 'breach_pressure',
			},
			{ type: 'BOSS_WARNING', slotIndex: 8, bossSlotIndex: 9, startAtSec: 210 },
			{ type: 'SUDDEN_DEATH_STARTED', slotIndex: 19, startAtSec: 540 },
			{ type: 'BUY_COOLDOWN_UPDATED', remainingMs: 1200 },
			{
				type: 'TOWER_MERGE_RESOLVED',
				success: false,
				fromPos: { x: 1, y: 2 },
				toPos: { x: 1, y: 3 },
				failureReason: 'merge_failed',
			},
		];

		expect(events).toHaveLength(8);
		expect(events[0].type).toBe('WAVE_STARTED');
		expect(events[1].type).toBe('PRESSURE_EARNED');
		expect(events[7].type).toBe('TOWER_MERGE_RESOLVED');
	});
});
