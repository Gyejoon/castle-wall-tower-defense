import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
	default: {
		Animations: { Events: { ANIMATION_COMPLETE: 'animationcomplete' } },
		GameObjects: { Events: { DESTROY: 'destroy' } },
	},
}));
vi.mock('../../src/audio/SoundGenerator', () => ({
	soundGenerator: { playTowerAttack: vi.fn(), playArrowImpact: vi.fn() },
}));
vi.mock('../../src/EventBus', () => ({ EventBus: { emit: vi.fn() } }));

import { TowerSystem } from '../../src/systems/TowerSystem';
import { buildGridManager, buildScene } from './helpers';

const pathfinding = {
	invalidateCache: vi.fn(),
	findPath: vi.fn(() => [
		{ x: 0, y: 0 },
		{ x: 1, y: 0 },
	]),
};

interface AttackLine {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	style: 'beam' | 'arc' | 'arrow';
	towerType?: string;
	impactPending?: boolean;
	pendingDamage?: Array<{ unitId: string; damage: number }>;
}

function getAttackLines(towerSystem: TowerSystem): AttackLine[] {
	return (towerSystem as unknown as { attackLines: AttackLine[] }).attackLines;
}

describe('TowerSystem special-case tower VFX (characterization)', () => {
	it('twin_archer fires two arrow projectiles, each half damage', () => {
		const { scene } = buildScene();
		const gridManager = buildGridManager();
		const towerSystem = new TowerSystem(
			scene as never,
			gridManager as never,
			pathfinding as never,
		);

		const placement = towerSystem.placeTower(1, 0, 'twin_archer');
		expect(placement.success).toBe(true);

		towerSystem.update(10_000, 16, [
			{
				instanceId: 'enemy_1',
				x: 2 * 48,
				y: 0,
				hp: 100,
				element: 'neutral',
			} as never,
		]);

		const lines = getAttackLines(towerSystem);
		expect(lines).toHaveLength(2);
		for (const line of lines) {
			expect(line.style).toBe('arrow');
			expect(line.towerType).toBe('twin_archer');
		}
		// twin_archer 기본 데미지 10 / 2발 → 각 5.
		const damages = lines.map((l) => l.pendingDamage?.[0]?.damage ?? 0);
		expect(damages).toEqual([5, 5]);
	});

	it('nova_cannon fires an arc projectile from the barrel tip offset', () => {
		// barrel 텍스처 존재 시 rotating-barrel 분기가 활성화된다.
		const { scene } = buildScene(new Set(['tower-nova_cannon-barrel']));
		const gridManager = buildGridManager();
		const towerSystem = new TowerSystem(
			scene as never,
			gridManager as never,
			pathfinding as never,
		);

		const placement = towerSystem.placeTower(1, 0, 'nova_cannon');
		expect(placement.success).toBe(true);

		// 타워 바로 오른쪽에 타겟 → rotation=0, 포신 끝 공식이 (x+10, y+0)으로 단순화.
		towerSystem.update(10_000, 16, [
			{
				instanceId: 'enemy_1',
				x: 3 * 48,
				y: 0,
				hp: 100,
				element: 'neutral',
			} as never,
		]);

		const lines = getAttackLines(towerSystem);
		expect(lines).toHaveLength(1);
		expect(lines[0].style).toBe('arc');
		expect(lines[0].towerType).toBe('nova_cannon');

		// Scene stub이 x=100,y=100을 반환하므로 fireOrigin은 (110, 100).
		expect(lines[0].x1).toBeCloseTo(110);
		expect(lines[0].y1).toBeCloseTo(100);
	});

	it('earth_golem fires an arc projectile (splash + id branch forces arc)', () => {
		const { scene } = buildScene();
		const gridManager = buildGridManager();
		const towerSystem = new TowerSystem(
			scene as never,
			gridManager as never,
			pathfinding as never,
		);

		const placement = towerSystem.placeTower(1, 0, 'earth_golem');
		expect(placement.success).toBe(true);

		towerSystem.update(10_000, 16, [
			{
				instanceId: 'enemy_1',
				x: 2 * 48,
				y: 0,
				hp: 100,
				element: 'neutral',
			} as never,
		]);

		const lines = getAttackLines(towerSystem);
		// earth_golem은 special 접두사와 무관하게 arc 스타일이어야 한다.
		expect(lines).toHaveLength(1);
		expect(lines[0].style).toBe('arc');
		expect(lines[0].towerType).toBe('earth_golem');
		expect(lines[0].impactPending).toBe(true);
	});
});
