import Phaser from 'phaser';

export class Boot extends Phaser.Scene {
	constructor() {
		super('Boot');
	}

	preload() {
		this.load.json('asset-manifest', 'assets/asset-manifest.json');
	}

	async create() {
		await document.fonts.ready;
		this.scene.start('Preloader');
	}
}
