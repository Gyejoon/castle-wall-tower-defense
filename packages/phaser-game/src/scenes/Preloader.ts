import Phaser from 'phaser';
import {
	getCachedAssetManifest,
	getCoreUnitIds,
	preloadAssetSection,
	shouldUseWebPTextures,
} from '../assets/assetManifest';

const supportsWebP = shouldUseWebPTextures();

export class Preloader extends Phaser.Scene {
	constructor() {
		super('Preloader');
	}

	preload() {
		const manifest = getCachedAssetManifest(this);
		preloadAssetSection(this, manifest, 'preload', supportsWebP);
	}

	create() {
		const manifest = getCachedAssetManifest(this);

		for (const id of getCoreUnitIds()) {
			const assetKey = `unit-${id}`;
			const entry = manifest.assets.find((a) => a.key === assetKey);
			if (!entry)
				console.warn(
					`[Preloader] No manifest entry for "${assetKey}", falling back to 8 frames`,
				);
			const endFrame = (entry?.frameCount ?? 8) - 1;

			this.anims.create({
				key: `${id}-walk`,
				frames: this.anims.generateFrameNumbers(assetKey, {
					start: 0,
					end: endFrame,
				}),
				frameRate: 10,
				repeat: -1,
			});
		}

		// Boss walk animations (looping)
		for (const bossKey of ['unit-titan-boss', 'unit-titan-boss-rage']) {
			const entry = manifest.assets.find((a) => a.key === bossKey);
			if (!entry) continue;
			const endFrame = (entry.frameCount ?? 8) - 1;
			this.anims.create({
				key: `anim-${bossKey}`,
				frames: this.anims.generateFrameNumbers(bossKey, {
					start: 0,
					end: endFrame,
				}),
				frameRate: 10,
				repeat: -1,
			});
		}

		{
			const entry = manifest.assets.find((a) => a.key === 'unit-death');
			if (!entry)
				console.warn(
					'[Preloader] No manifest entry for "unit-death", falling back to 8 frames',
				);
			const endFrame = (entry?.frameCount ?? 8) - 1;

			this.anims.create({
				key: 'unit-death',
				frames: this.anims.generateFrameNumbers('unit-death', {
					start: 0,
					end: endFrame,
				}),
				frameRate: 12,
				repeat: 0,
			});
		}

		this.scene.start('Game');
	}
}
