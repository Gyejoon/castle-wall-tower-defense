import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
	TINY_SWORDS_DECORATION_ASSETS,
	TINY_SWORDS_TILESET_ASSETS,
} from '../src/fieldAssets';

describe('Tiny Swords vendor assets', () => {
	it('exist under the vendored asset directory', () => {
		for (const asset of [
			...TINY_SWORDS_TILESET_ASSETS,
			...TINY_SWORDS_DECORATION_ASSETS,
		]) {
			expect(
				existsSync(
					new URL(`../../web-shell/public/${asset.path}`, import.meta.url),
				),
			).toBe(true);
		}
	});
});
