import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
	constructor() {
		super('UIScene');
	}

	create() {
		// UI components will be added in Task 7
		this.events.on('shutdown', this.shutdown, this);
	}

	shutdown() {
		// Cleanup will be added in Task 7
	}
}
