import {
	MIN_MOVE_SPEED,
	type Position,
	STUN_IMMUNITY_WINDOW_MS,
} from '@gld/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
	default: {
		Animations: {
			Events: {
				ANIMATION_COMPLETE: 'animationcomplete',
			},
		},
	},
}));

vi.mock('../src/audio/SoundGenerator', () => ({
	soundGenerator: { playTowerAttack: vi.fn() },
}));

vi.mock('../src/EventBus', () => ({
	EventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
}));

import { UnitSystem } from '../src/systems/UnitSystem';

function createSprite() {
	return {
		setDisplaySize: vi.fn().mockReturnThis(),
		setDepth: vi.fn().mockReturnThis(),
		setPosition: vi.fn().mockReturnThis(),
		setTint: vi.fn().mockReturnThis(),
		clearTint: vi.fn().mockReturnThis(),
		setTexture: vi.fn().mockReturnThis(),
		setRotation: vi.fn().mockReturnThis(),
		setFlipX: vi.fn().mockReturnThis(),
		play: vi.fn().mockReturnThis(),
		once: vi.fn(),
		destroy: vi.fn(),
		active: true,
	};
}

function createGraphics() {
	return {
		clear: vi.fn().mockReturnThis(),
		fillStyle: vi.fn().mockReturnThis(),
		fillRect: vi.fn().mockReturnThis(),
		destroy: vi.fn(),
	};
}

interface FakeScene {
	time: { now: number };
	add: {
		sprite: ReturnType<typeof vi.fn>;
		graphics: ReturnType<typeof vi.fn>;
		ellipse: ReturnType<typeof vi.fn>;
	};
	textures: { exists: ReturnType<typeof vi.fn> };
	anims: { exists: ReturnType<typeof vi.fn> };
}

function createScene(): FakeScene {
	return {
		time: { now: 0 },
		add: {
			sprite: vi.fn(() => createSprite()),
			graphics: vi.fn(() => createGraphics()),
			ellipse: vi.fn(() => ({
				setDepth: vi.fn(),
				setPosition: vi.fn(),
				destroy: vi.fn(),
			})),
		},
		textures: { exists: vi.fn(() => false) },
		anims: { exists: vi.fn(() => true) },
	};
}

function createGridManager(tileSize = 32) {
	return {
		orthoTile: tileSize,
		width: 10,
		height: 10,
		gridToWorld: vi.fn((x: number, y: number) => ({
			x: x * tileSize,
			y: y * tileSize,
		})),
		worldToGrid: vi.fn((x: number, y: number) => ({
			x: Math.floor(x / tileSize),
			y: Math.floor(y / tileSize),
		})),
		getDepth: vi.fn(() => 10),
	};
}

const SHORT_LANE: Position[] = Array.from({ length: 10 }, (_, i) => ({
	x: i,
	y: 0,
}));

function spawnAndGet(
	system: UnitSystem,
	scene: FakeScene,
	defId: string,
	isBoss = false,
): { id: string; unit: NonNullable<ReturnType<UnitSystem['getUnit']>> } {
	system.queueUnits(defId, 1, { isBoss });
	system.update(0, 301);
	scene.time.now = 0; // reset to a deterministic baseline after spawn tick
	// Last spawned unit id = max numeric suffix.
	const positions = system.getUnitPositions();
	const last = positions[positions.length - 1];
	const unit = system.getUnit(last.instanceId);
	if (!unit) throw new Error('spawnAndGet: unit not found');
	return { id: last.instanceId, unit };
}

describe('Phase 11 [F16] CC guardrails', () => {
	let scene: FakeScene;
	let grid: ReturnType<typeof createGridManager>;
	let system: UnitSystem;

	beforeEach(() => {
		scene = createScene();
		grid = createGridManager();
		system = new UnitSystem(scene as never, grid as never);
		system.setRng(() => 1); // never trigger ccImmunityChance dodge
		system.setPaths([SHORT_LANE]);
	});

	it('exports MIN_MOVE_SPEED = 0.15 from shared', () => {
		expect(MIN_MOVE_SPEED).toBe(0.15);
	});

	it('exports STUN_IMMUNITY_WINDOW_MS = 2000 from shared', () => {
		expect(STUN_IMMUNITY_WINDOW_MS).toBe(2000);
	});

	it('normal unit takes a 1000ms slow at full duration', () => {
		const { id, unit } = spawnAndGet(system, scene, 'scout_drone');
		expect(unit.ccResistance).toBe(0);
		system.applySlow(id, 0.5, 1000);
		expect(unit.slowRemaining).toBe(1000);
	});

	it('slow factor below MIN_MOVE_SPEED is floored to MIN_MOVE_SPEED', () => {
		const { id, unit } = spawnAndGet(system, scene, 'scout_drone');
		// Try to floor the unit at 0 speed — should clamp to 0.15.
		system.applySlow(id, 0.0, 1000);
		expect(unit.slowFactor).toBe(MIN_MOVE_SPEED);
	});

	it('boss with ccResistance=0.5 takes a 1000ms slow as 500ms', () => {
		const { id, unit } = spawnAndGet(system, scene, 'orc_warlord', true);
		expect(unit.ccResistance).toBe(0.5);
		system.applySlow(id, 0.5, 1000);
		expect(unit.slowRemaining).toBe(500);
	});

	it('boss with ccResistance=0.5 takes a 2000ms stun as 1000ms', () => {
		const { id, unit } = spawnAndGet(system, scene, 'orc_warlord', true);
		system.applyStun(id, 2000);
		expect(unit.stunRemaining).toBe(1000);
	});

	it('re-stun within 2s immunity window is rejected', () => {
		const { id, unit } = spawnAndGet(system, scene, 'scout_drone');
		// Unit has no ccImmunity dodge and ccResistance=0, so the first stun
		// applies cleanly.
		system.applyStun(id, 500);
		expect(unit.stunRemaining).toBe(500);

		// Advance scene time + delta to drain the stun and trigger the
		// post-stun immunity window. Each update() tick consumes `delta` from
		// stunRemaining and sets stunImmunityUntil = time + 2000 when it hits 0.
		scene.time.now = 600;
		system.update(600, 600);
		expect(unit.stunRemaining).toBe(0);
		expect(unit.stunImmunityUntil).toBe(600 + STUN_IMMUNITY_WINDOW_MS);

		// Re-apply a stun 1000ms later — still inside the 2000ms window.
		scene.time.now = 1600;
		system.applyStun(id, 800);
		expect(unit.stunRemaining).toBe(0); // rejected
	});

	it('re-stun outside the 2s immunity window is applied', () => {
		const { id, unit } = spawnAndGet(system, scene, 'scout_drone');
		system.applyStun(id, 500);

		// Drain the stun (scene at t=600).
		scene.time.now = 600;
		system.update(600, 600);
		expect(unit.stunImmunityUntil).toBe(600 + STUN_IMMUNITY_WINDOW_MS);

		// Now jump well past the window (t=3000) — second stun should land.
		scene.time.now = 3000;
		system.applyStun(id, 800);
		expect(unit.stunRemaining).toBe(800);
	});

	it('stun/slow on a pendingDestroy unit는 무시되어 death anim cleanup을 보존한다', () => {
		const { id, unit } = spawnAndGet(system, scene, 'scout_drone');
		// Simulate the unit just died — applyDamage sets pendingDestroy, plays
		// death anim, and attaches the ANIMATION_COMPLETE cleanup listener.
		unit.pendingDestroy = true;
		unit.data.hp = 0;
		unit.animationState = 'death';
		(unit.sprite.play as ReturnType<typeof vi.fn>).mockClear();

		system.applyStun(id, 1000);
		system.applySlow(id, 0.5, 1000);

		// No further play() call → death anim is not interrupted.
		expect(unit.sprite.play).not.toHaveBeenCalled();
		// Stun/slow state untouched.
		expect(unit.stunRemaining).toBe(0);
		expect(unit.slowRemaining).toBe(0);
		expect(unit.animationState).toBe('death');
	});
});
