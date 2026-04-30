import Phaser from 'phaser';
import { TOWER_ASSET_VERSION } from '../assets/assetManifest';

export class Boot extends Phaser.Scene {
	constructor() {
		super('Boot');
	}

	preload() {
		this.load.json(
			'asset-manifest',
			`assets/asset-manifest.json?v=${TOWER_ASSET_VERSION}`,
		);
	}

	create() {
		this.scene.start('Preloader');
	}
}
