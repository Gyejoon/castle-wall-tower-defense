import { describe, expect, it } from 'vitest';
import { SummonPoolSystem } from '../src/systems/SummonPoolSystem';

describe('SummonPoolSystem', () => {
	it('생성자는 초기 풀을 받음', () => {
		const sys = new SummonPoolSystem(['archer', 'nova_cannon']);
		expect(sys.getPool().towerIds).toEqual(['archer', 'nova_cannon']);
	});

	it('draw()는 결정론적 rng와 함께 동작 — towerId만 반환', () => {
		const sys = new SummonPoolSystem(['archer', 'nova_cannon'], () => 0);
		const r = sys.draw();
		expect(r.towerId).toBe('archer');
		expect((r as Record<string, unknown>).grade).toBeUndefined();
	});

	it('reset()은 초기 풀로 복구', () => {
		const sys = new SummonPoolSystem(['archer']);
		sys.replacePool(['nova_cannon']);
		sys.reset();
		expect(sys.getPool().towerIds).toEqual(['archer']);
	});
});
