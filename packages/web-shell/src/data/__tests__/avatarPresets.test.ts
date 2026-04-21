import { describe, expect, it } from 'vitest';
import { AVATAR_PRESETS, isValidAvatarKey } from '../avatarPresets';

describe('avatar presets', () => {
	it('has 16 presets', () => {
		expect(AVATAR_PRESETS).toHaveLength(16);
	});

	it('keys are unique', () => {
		const keys = AVATAR_PRESETS.map((p) => p.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('keys are namespaced under tower/', () => {
		for (const p of AVATAR_PRESETS) {
			expect(p.key.startsWith('tower/')).toBe(true);
		}
	});

	it('isValidAvatarKey accepts presets and rejects others', () => {
		expect(isValidAvatarKey('tower/archer')).toBe(true);
		expect(isValidAvatarKey('evil/hack')).toBe(false);
		expect(isValidAvatarKey('')).toBe(false);
	});
});
