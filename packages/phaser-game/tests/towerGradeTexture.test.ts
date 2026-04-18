import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
	default: {},
}));

import { resolveTowerTextureKey } from '../src/systems/TowerSystem';

describe('resolveTowerTextureKey (Phase 1 — grade removed)', () => {
	it('returns tower-${id} for any tower id', () => {
		expect(resolveTowerTextureKey('archer')).toBe('tower-archer');
		expect(resolveTowerTextureKey('flame_tower')).toBe('tower-flame_tower');
		expect(resolveTowerTextureKey('ultimate')).toBe('tower-ultimate');
	});
});
