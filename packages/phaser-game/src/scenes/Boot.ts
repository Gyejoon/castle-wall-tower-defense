import Phaser from 'phaser';

export class Boot extends Phaser.Scene {
	constructor() {
		super('Boot');
	}

	preload() {
		this.load.json('asset-manifest', 'assets/asset-manifest.json');
	}

	create() {
		this.scene.start('Preloader');
	}
}
