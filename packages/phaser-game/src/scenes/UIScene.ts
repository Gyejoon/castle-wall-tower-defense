import Phaser from 'phaser';
import { BossHpBarUI } from '../ui/BossHpBarUI';
import { DeckDockUI } from '../ui/DeckDockUI';
import { TopHudUI } from '../ui/TopHudUI';

export class UIScene extends Phaser.Scene {
	private topHud!: TopHudUI;
	private bossHpBar!: BossHpBarUI;
	private deckDock!: DeckDockUI;

	constructor() {
		super('UIScene');
	}

	create() {
		this.topHud = new TopHudUI(this);
		const bossBarTop = this.topHud.getHeight();
		this.bossHpBar = new BossHpBarUI(this, bossBarTop);

		const safeAreaBottom =
			(this.game.registry.get('safeAreaBottom') as number) ?? 0;
		this.deckDock = new DeckDockUI(this, safeAreaBottom);

		this.events.on('shutdown', this.handleShutdown, this);
	}

	private handleShutdown(): void {
		this.topHud?.destroy();
		this.bossHpBar?.destroy();
		this.deckDock?.destroy();
	}
}
