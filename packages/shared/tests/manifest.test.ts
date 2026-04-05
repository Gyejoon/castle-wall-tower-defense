import { describe, expect, it } from 'vitest';
import type { AssetManifestSection } from '../src/assets/manifest';
import { inferAssetManifestSection } from '../src/assets/manifest';

// Compile-time type tests: these must not cause TS errors
const _boss: AssetManifestSection = 'boss';
const _reward: AssetManifestSection = 'reward';
const _tutorial: AssetManifestSection = 'tutorial';
const _gacha: AssetManifestSection = 'gacha';
void [_boss, _reward, _tutorial, _gacha];

describe('inferAssetManifestSection — new sections', () => {
	it('routes /boss/ paths to boss section', () => {
		expect(
			inferAssetManifestSection({
				key: 'boss-titan',
				path: 'assets/boss/titan.png',
			}),
		).toBe('boss');
	});

	it('routes /reward/ paths to reward section', () => {
		expect(
			inferAssetManifestSection({
				key: 'reward-victory',
				path: 'assets/reward/victory.png',
			}),
		).toBe('reward');
	});

	it('routes /tutorial/ paths to tutorial section', () => {
		expect(
			inferAssetManifestSection({
				key: 'tut-arrow',
				path: 'assets/tutorial/arrow.png',
			}),
		).toBe('tutorial');
	});

	it('routes /gacha/ paths to gacha section', () => {
		expect(
			inferAssetManifestSection({
				key: 'gacha-box',
				path: 'assets/gacha/box.png',
			}),
		).toBe('gacha');
	});

	it('preserves existing routing unchanged', () => {
		expect(
			inferAssetManifestSection({ key: 'ui-hp', path: 'assets/ui/hp.png' }),
		).toBe('ui');
		expect(
			inferAssetManifestSection({ key: 'vfx-exp', path: 'assets/vfx/exp.png' }),
		).toBe('vfx');
		expect(
			inferAssetManifestSection({
				key: 'tower-laser',
				path: 'assets/towers/laser.png',
			}),
		).toBe('preload');
		expect(
			inferAssetManifestSection({
				key: 'tower-laser-fire',
				path: 'assets/towers/laser-fire.png',
			}),
		).toBe('vfx');
		expect(
			inferAssetManifestSection({
				key: 'icon-192',
				path: 'assets/icons/icon-192.png',
			}),
		).toBe('icons');
		expect(
			inferAssetManifestSection({
				key: 'proj-laser',
				path: 'assets/projectiles/laser.png',
			}),
		).toBe('projectiles');
		expect(
			inferAssetManifestSection({
				key: 'lobby-bg',
				path: 'assets/ui-mobile/lobby.webp',
			}),
		).toBe('mobile');
	});
});
