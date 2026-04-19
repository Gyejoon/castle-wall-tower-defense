import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => {
	class EventEmitter {
		private map = new Map<string, Set<(...args: unknown[]) => void>>();
		emit(event: string, ...args: unknown[]): void {
			const set = this.map.get(event);
			if (!set) return;
			for (const fn of set) fn(...args);
		}
		on(event: string, fn: (...args: unknown[]) => void): void {
			if (!this.map.has(event)) this.map.set(event, new Set());
			this.map.get(event)?.add(fn);
		}
		off(event: string, fn: (...args: unknown[]) => void): void {
			this.map.get(event)?.delete(fn);
		}
		removeAllListeners(): void {
			this.map.clear();
		}
	}
	return {
		default: {
			Animations: {
				Events: {
					ANIMATION_COMPLETE: 'animationcomplete',
				},
			},
			GameObjects: {
				Events: {
					DESTROY: 'destroy',
				},
			},
		},
		Events: { EventEmitter },
	};
});

vi.mock('../src/audio/SoundGenerator', () => ({
	soundGenerator: {
		playTowerAttack: vi.fn(),
		playArrowImpact: vi.fn(),
	},
}));

import {
	BASE_ENHANCE_COST,
	inBattleDamageMultiplier,
	inBattleEnhanceCost,
	MAX_IN_BATTLE_LEVEL,
} from '@gld/shared';
import { EventBus } from '../src/EventBus';
import { GoldSystem } from '../src/systems/GoldSystem';
import { PhaseAOrchestrator } from '../src/systems/PhaseAOrchestrator';
import { TowerSystem } from '../src/systems/TowerSystem';

function createGraphics() {
	return {
		setDepth: vi.fn().mockReturnThis(),
		clear: vi.fn().mockReturnThis(),
		fillStyle: vi.fn().mockReturnThis(),
		fillEllipse: vi.fn().mockReturnThis(),
		strokeEllipse: vi.fn().mockReturnThis(),
		lineStyle: vi.fn().mockReturnThis(),
		fillCircle: vi.fn().mockReturnThis(),
		strokeCircle: vi.fn().mockReturnThis(),
		fillRect: vi.fn().mockReturnThis(),
		beginPath: vi.fn().mockReturnThis(),
		moveTo: vi.fn().mockReturnThis(),
		lineTo: vi.fn().mockReturnThis(),
		strokePath: vi.fn().mockReturnThis(),
		destroy: vi.fn(),
	};
}

function createImage() {
	return {
		setDisplaySize: vi.fn().mockReturnThis(),
		setPosition: vi.fn().mockReturnThis(),
		setRotation: vi.fn().mockReturnThis(),
		setAlpha: vi.fn().mockReturnThis(),
		setY: vi.fn().mockReturnThis(),
		setDepth: vi.fn().mockReturnThis(),
		setVisible: vi.fn().mockReturnThis(),
		visible: false,
		active: true,
		scaleX: 1,
		scaleY: 1,
		x: 100,
		y: 100,
		rotation: 0,
		destroy: vi.fn(),
	};
}

function buildScene() {
	return {
		add: {
			graphics: vi.fn(() => createGraphics()),
			image: vi.fn(() => createImage()),
			sprite: vi.fn(() => createImage()),
		},
		textures: {
			exists: vi.fn(() => false),
		},
		anims: {
			exists: vi.fn(() => false),
		},
		tweens: {
			add: vi.fn(() => ({ stop: vi.fn(), remove: vi.fn() })),
		},
	};
}

function buildGridManager() {
	return {
		orthoTile: 48,
		isInBounds: vi.fn(() => true),
		isWalkable: vi.fn(() => true),
		canPlaceTower: vi.fn(() => true),
		placeTower: vi.fn(() => true),
		removeTower: vi.fn(),
		getWalkabilityGrid: vi.fn(() => []),
		spawnPoint: { x: 0, y: 0 },
		exitPoint: { x: 4, y: 17 },
		gridToWorld: vi.fn((col: number, row: number) => ({
			x: col * 48,
			y: row * 48,
		})),
		getDepth: vi.fn(() => 10),
		worldToGridFloat: vi.fn(() => ({ x: 0, y: 0 })),
	};
}

const pathfinding = {
	invalidateCache: vi.fn(),
	findPath: vi.fn(() => [
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
	]),
	validateAllPaths: vi.fn(() => true),
};

function makeSystems() {
	const towerSystem = new TowerSystem(
		buildScene() as never,
		buildGridManager() as never,
		pathfinding as never,
	);
	const goldSystem = new GoldSystem(10_000);
	const orchestrator = new PhaseAOrchestrator({
		towerSystem,
		initialPool: ['archer'],
		goldSystem,
	});
	return { towerSystem, goldSystem, orchestrator };
}

describe('In-battle tower enhance', () => {
	let towerSystem!: TowerSystem;
	let goldSystem!: GoldSystem;
	let orchestrator!: PhaseAOrchestrator;

	beforeEach(() => {
		const sys = makeSystems();
		towerSystem = sys.towerSystem;
		goldSystem = sys.goldSystem;
		orchestrator = sys.orchestrator;
	});

	afterEach(() => {
		orchestrator.destroy();
		EventBus.removeAllListeners();
	});

	it('cost formula scales geometrically and rounds to 5', () => {
		// L1 → L2 should equal BASE rounded to 5
		expect(inBattleEnhanceCost(1)).toBe(BASE_ENHANCE_COST);
		// L2 → L3 should be > L1 → L2 (geometric growth)
		expect(inBattleEnhanceCost(2)).toBeGreaterThan(inBattleEnhanceCost(1));
		// All in-range costs are multiples of 5
		for (let lvl = 1; lvl < MAX_IN_BATTLE_LEVEL; lvl++) {
			expect(inBattleEnhanceCost(lvl) % 5).toBe(0);
		}
		// At cap → infinite (callers short-circuit)
		expect(inBattleEnhanceCost(MAX_IN_BATTLE_LEVEL)).toBe(
			Number.POSITIVE_INFINITY,
		);
	});

	it('enhance L1 → L2 deducts gold, bumps level, scales damage to base × 1.15', () => {
		const place = towerSystem.placeTower(0, 0, 'archer');
		expect(place.success).toBe(true);
		const baseInstance = towerSystem.getTowerAt(0, 0);
		expect(baseInstance?.data.level).toBe(1);

		const goldBefore = goldSystem.getGold();
		const events: Array<{ newLevel: number; damage: number }> = [];
		EventBus.on('tower-enhanced', (d) => events.push(d));

		EventBus.emit('request-enhance-tower', { col: 0, row: 0 });

		const after = towerSystem.getTowerAt(0, 0);
		expect(after?.data.level).toBe(2);
		expect(events).toHaveLength(1);
		expect(events[0].newLevel).toBe(2);

		// Damage should be base × inBattleDamageMultiplier(2) = base × 1.15
		const baseDamage = after?.def.stats.damage ?? 0;
		expect(events[0].damage).toBeCloseTo(
			baseDamage * inBattleDamageMultiplier(2),
		);

		// Gold deducted by exactly the L1→L2 cost.
		expect(goldSystem.getGold()).toBe(goldBefore - inBattleEnhanceCost(1));
	});

	it('enhance at MAX is rejected with max-level and gold is not touched', () => {
		towerSystem.placeTower(0, 0, 'archer');
		// Force-bump to max via direct enhanceTower calls (bypasses gold check)
		for (let i = 1; i < MAX_IN_BATTLE_LEVEL; i++) {
			const result = towerSystem.enhanceTower(0, 0);
			expect(result.success).toBe(true);
		}
		const at = towerSystem.getTowerAt(0, 0);
		expect(at?.data.level).toBe(MAX_IN_BATTLE_LEVEL);

		const goldBefore = goldSystem.getGold();
		const failures: Array<{ reason: string }> = [];
		EventBus.on('enhance-failed', (d) => failures.push(d));

		EventBus.emit('request-enhance-tower', { col: 0, row: 0 });

		expect(failures).toHaveLength(1);
		expect(failures[0].reason).toBe('max-level');
		// Gold untouched on max-level rejection.
		expect(goldSystem.getGold()).toBe(goldBefore);
		// Level unchanged.
		expect(towerSystem.getTowerAt(0, 0)?.data.level).toBe(MAX_IN_BATTLE_LEVEL);
	});

	it('insufficient gold leaves level unchanged and emits enhance-failed', () => {
		const place = towerSystem.placeTower(0, 0, 'archer');
		expect(place.success).toBe(true);
		// Drain gold to below L1→L2 cost.
		goldSystem.spend(goldSystem.getGold());
		expect(goldSystem.getGold()).toBe(0);

		const failures: Array<{ reason: string }> = [];
		const successes: unknown[] = [];
		EventBus.on('enhance-failed', (d) => failures.push(d));
		EventBus.on('tower-enhanced', (d) => successes.push(d));

		EventBus.emit('request-enhance-tower', { col: 0, row: 0 });

		expect(failures).toHaveLength(1);
		expect(failures[0].reason).toBe('insufficient-gold');
		expect(successes).toHaveLength(0);
		expect(towerSystem.getTowerAt(0, 0)?.data.level).toBe(1);
	});

	it('enhance on empty tile emits tower-not-found', () => {
		const failures: Array<{ reason: string }> = [];
		EventBus.on('enhance-failed', (d) => failures.push(d));

		EventBus.emit('request-enhance-tower', { col: 5, row: 5 });

		expect(failures).toHaveLength(1);
		expect(failures[0].reason).toBe('tower-not-found');
	});
});
