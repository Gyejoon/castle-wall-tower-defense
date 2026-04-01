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
		for (const id of getCoreUnitIds()) {
			this.anims.create({
				key: `${id}-walk`,
				frames: this.anims.generateFrameNumbers(`unit-${id}`, {
					start: 0,
					end: 3,
				}),
				frameRate: 8,
				repeat: -1,
			});
		}

		this.anims.create({
			key: 'unit-death',
			frames: this.anims.generateFrameNumbers('unit-death', {
				start: 0,
				end: 3,
			}),
			frameRate: 10,
			repeat: 0,
		});

		this.scene.start('Game');
	}
}
