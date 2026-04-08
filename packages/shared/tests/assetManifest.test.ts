import { describe, expect, it } from 'vitest';
import {
	type AssetManifestEntry,
	inferAssetManifestSection,
	withManifestSection,
	withManifestSections,
} from '../src/assets/manifest';

describe('asset manifest helpers', () => {
	it('infers sections from stable asset path conventions', () => {
		expect(
			inferAssetManifestSection({
				key: 'grid-floor',
				path: 'assets/tiles/grid-floor.png',
			}),
		).toBe('preload');
		expect(
			inferAssetManifestSection({
				key: 'ui-hp-bar',
				path: 'assets/ui/hp-bar.png',
			}),
		).toBe('ui');
		expect(
			inferAssetManifestSection({
				key: 'tower-archer-fire',
				path: 'assets/towers/archer-fire.png',
			}),
		).toBe('vfx');
		expect(
			inferAssetManifestSection({
				key: 'cta-point-art',
				path: 'assets/ui-mobile/cta-point-art.png',
			}),
		).toBe('mobile');
		expect(
			inferAssetManifestSection({
				key: 'icon-512',
				path: 'assets/icons/icon-512.png',
			}),
		).toBe('icons');
	});

	it('preserves explicit sections when normalizing a single entry', () => {
		const entry: AssetManifestEntry = {
			key: 'vfx-explosion-sm',
			type: 'spritesheet',
			path: 'assets/vfx/explosion-sm.png',
			section: 'projectiles',
			frameWidth: 32,
			frameHeight: 32,
			frameCount: 4,
		};

		expect(withManifestSection(entry)).toEqual(entry);
	});

	it('normalizes missing sections across a manifest entry list', () => {
		const entries: AssetManifestEntry[] = [
			{
				key: 'grid-floor',
				type: 'image',
				path: 'assets/tiles/grid-floor.png',
			},
			{
				key: 'ui-stat-icons',
				type: 'spritesheet',
				path: 'assets/ui/stat-icons.png',
				frameWidth: 16,
				frameHeight: 16,
				frameCount: 8,
			},
		];

		expect(withManifestSections(entries)).toEqual([
			{
				key: 'grid-floor',
				type: 'image',
				path: 'assets/tiles/grid-floor.png',
				section: 'preload',
			},
			{
				key: 'ui-stat-icons',
				type: 'spritesheet',
				path: 'assets/ui/stat-icons.png',
				frameWidth: 16,
				frameHeight: 16,
				frameCount: 8,
				section: 'ui',
			},
		]);
	});
});
