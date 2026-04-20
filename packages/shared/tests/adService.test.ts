import { describe, expect, it, vi } from 'vitest';
import { MockAdService } from '../src';

describe('MockAdService', () => {
	it('resolves to "rewarded" for the continue placement', async () => {
		const result = await MockAdService.watchAd('continue');
		expect(result).toBe('rewarded');
	});

	it('resolves to "rewarded" for the reroll placement', async () => {
		const result = await MockAdService.watchAd('reroll');
		expect(result).toBe('rewarded');
	});

	it('logs the placement it was called with', async () => {
		const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
		try {
			await MockAdService.watchAd('continue');
			expect(spy).toHaveBeenCalledWith('[ad] watch continue');
		} finally {
			spy.mockRestore();
		}
	});
});
