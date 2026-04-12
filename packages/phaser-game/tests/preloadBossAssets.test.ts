import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const manifest = JSON.parse(
	readFileSync(
		new URL(
			'../../web-shell/public/assets/asset-manifest.json',
			import.meta.url,
		),
		'utf-8',
	),
) as {
	assets: Array<{
		key: string;
		path: string;
		type: 'image' | 'spritesheet' | 'tilemapTiledJSON';
		section?: string;
	}>;
};

describe('boss and advanced unit preload assets', () => {
	it('includes newly spawned W2/W3 combat units and bosses in the generated manifest', () => {
		const keys = new Set(manifest.assets.map((asset) => asset.key));

		expect(keys.has('unit-arcane_mage')).toBe(true);
		expect(keys.has('unit-mana_shield')).toBe(true);
		expect(keys.has('unit-orc_warlord')).toBe(true);
		expect(keys.has('unit-forge_master')).toBe(true);
		expect(keys.has('unit-corrupted_archmage')).toBe(true);
	});
});
