import Phaser from 'phaser';
import {
	getCachedAssetManifest,
	getCoreUnitIds,
	preloadAssetSection,
	shouldUseWebPTextures,
} from '../assets/assetManifest';
import {
	MAIN_LONG_BACKGROUND_KEY,
	MAIN_LONG_CENTRAL_CASTLE_KEY,
} from './render/FieldRenderer';

const supportsWebP = shouldUseWebPTextures();

export class Preloader extends Phaser.Scene {
	constructor() {
		super('Preloader');
	}

	preload() {
		const manifest = getCachedAssetManifest(this);
		this.load.image(
			MAIN_LONG_BACKGROUND_KEY,
			supportsWebP
				? 'assets/maps/main-long-bg-hq.webp'
				: 'assets/maps/main-long-bg.png',
		);
		this.load.image(
			MAIN_LONG_CENTRAL_CASTLE_KEY,
			supportsWebP
				? 'assets/maps/main-long-central-castle.webp'
				: 'assets/maps/main-long-central-castle.png',
		);
		preloadAssetSection(this, manifest, 'preload', supportsWebP);
	}

	create() {
		const manifest = getCachedAssetManifest(this);
		const createUnitAnim = (
			assetKey: string,
			animationKey: string,
			frameRate: number,
			repeat: number,
		) => {
			const entry = manifest.assets.find((a) => a.key === assetKey);
			if (!entry) return;
			const endFrame = (entry.frameCount ?? 8) - 1;
			this.anims.create({
				key: animationKey,
				frames: this.anims.generateFrameNumbers(assetKey, {
					start: 0,
					end: endFrame,
				}),
				frameRate,
				repeat,
			});
		};

		for (const id of getCoreUnitIds()) {
			const walkAssetKey = `unit-${id}`;
			const walkEntry = manifest.assets.find((a) => a.key === walkAssetKey);
			if (!walkEntry) {
				console.warn(
					`[Preloader] No manifest entry for "${walkAssetKey}", falling back to 8 frames`,
				);
			}
			const walkEndFrame = (walkEntry?.frameCount ?? 8) - 1;

			this.anims.create({
				key: `${id}-walk`,
				frames: this.anims.generateFrameNumbers(walkAssetKey, {
					start: 0,
					end: walkEndFrame,
				}),
				frameRate: 7,
				repeat: -1,
			});

			createUnitAnim(`unit-${id}-idle`, `${id}-idle`, 8, -1);
			createUnitAnim(`unit-${id}-death`, `${id}-death`, 12, 0);
		}

		// Boss walk animations (looping)
		for (const bossKey of ['unit-dragon-boss', 'unit-dragon-boss-rage']) {
			const entry = manifest.assets.find((a) => a.key === bossKey);
			if (!entry) continue;
			const endFrame = (entry.frameCount ?? 8) - 1;
			this.anims.create({
				key: `anim-${bossKey}`,
				frames: this.anims.generateFrameNumbers(bossKey, {
					start: 0,
					end: endFrame,
				}),
				frameRate: 7,
				repeat: -1,
			});
		}

		this.scene.start('Game');
	}
}
