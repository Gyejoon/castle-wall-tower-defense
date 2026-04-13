import { describe, expect, it } from 'vitest';
import { SummonPoolSystem } from '../src/systems/SummonPoolSystem';

describe('SummonPoolSystem', () => {
	it('생성자는 초기 풀을 받음', () => {
		const sys = new SummonPoolSystem(['archer', 'plasma']);
		expect(sys.getPool().towerIds).toEqual(['archer', 'plasma']);
	});

	it('draw()는 결정론적 rng와 함께 동작', () => {
		const sys = new SummonPoolSystem(['archer', 'plasma'], () => 0);
		const r = sys.draw();
		expect(r.towerId).toBe('archer');
		expect(r.grade).toBe('normal');
	});

	it('reset()은 초기 풀로 복구', () => {
		const sys = new SummonPoolSystem(['archer']);
		sys.replacePool(['plasma']);
		sys.reset();
		expect(sys.getPool().towerIds).toEqual(['archer']);
	});
});
