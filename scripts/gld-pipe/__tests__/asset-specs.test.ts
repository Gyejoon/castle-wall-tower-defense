import { describe, expect, test } from 'bun:test';
import {
	ASSET_SPECS,
	listAssetIds,
	resolveAssetIds,
} from '../lib/asset-specs';

describe('asset-specs', () => {
	test('listAssetIds enumerates all registered specs', () => {
		const ids = listAssetIds();
		expect(ids).toContain('archer');
		expect(ids).toContain('archer-fire');
		expect(ids).toContain('archer-epic-fire');
		// 4 grades × (static, fire) = 8 entries for the archer family.
		expect(ids.filter((id) => id.startsWith('archer')).length).toBe(8);
	});

	test('resolveAssetIds returns exact match when id is registered', () => {
		expect(resolveAssetIds('archer')).toEqual(['archer']);
		expect(resolveAssetIds('archer-fire')).toEqual(['archer-fire']);
	});

	test('resolveAssetIds expands "all" / "*" to every known id', () => {
		const all = resolveAssetIds('all');
		expect(all.length).toBe(listAssetIds().length);
		expect(resolveAssetIds('*')).toEqual(all);
	});

	test('resolveAssetIds falls back to prefix match for unknown exact ids', () => {
		// "archer_unknown" isn't registered, and "archer_unknown-" has no matches
		// so the result is empty — this ensures we don't accidentally match
		// "archer*" via substring.
		expect(resolveAssetIds('archer_unknown')).toEqual([]);
	});

	test('each spec has a deterministic per-asset noise seed', () => {
		const a = ASSET_SPECS['archer'].polish.noise.seed;
		const b = ASSET_SPECS['archer'].polish.noise.seed;
		expect(a).toBe(b);
		expect(a).toBeGreaterThan(0);
		// Different asset-ids should yield different seeds (not a guarantee, but
		// the hash is 32-bit FNV so collisions on these 8 inputs are implausible).
		const seeds = listAssetIds().map(
			(id) => ASSET_SPECS[id].polish.noise.seed,
		);
		expect(new Set(seeds).size).toBe(seeds.length);
	});

	test('fire-sheet specs declare animation frame dims', () => {
		expect(ASSET_SPECS['archer-fire'].polish.animation).toEqual({
			frameW: 64,
			frameH: 80,
			frameCount: 8,
		});
		expect(ASSET_SPECS['archer'].polish.animation).toBeUndefined();
	});
});
