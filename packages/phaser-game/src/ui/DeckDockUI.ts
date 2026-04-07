import { ALL_TOWERS, type DeckCardDef, GAME_CANVAS_H } from '@gld/shared';
import Phaser from 'phaser';
import { EventBus } from '../EventBus';

const FONT_FAMILY = 'Galmuri11';
const TEXT_RESOLUTION = 1;
const DOCK_HEIGHT = 90;
const CARD_HEIGHT = 86;
const CARD_GAP = 8;
const CARD_PAD_X = 12;

const COL_PANEL = 0x1a1208;
const COL_BORDER = 0x4a3a20;
const COL_GOLD = 0xf0d060;

const TOWER_NAME_MAP = new Map(ALL_TOWERS.map((t) => [t.id, t.name]));
const TOWER_TYPE_MAP = new Map(ALL_TOWERS.map((t) => [t.id, t.type]));

export class DeckDockUI {
	private scene: Phaser.Scene;
	private container: Phaser.GameObjects.Container;

	// Card containers
	private cardContainers: Phaser.GameObjects.Container[] = [];
	private cardBorders: Phaser.GameObjects.Rectangle[] = [];
	private cardCostTexts: Phaser.GameObjects.Text[] = [];
	private glowTweens: (Phaser.Tweens.Tween | null)[] = [];

	// State
	private deckCards: readonly DeckCardDef[] = [];
	private selectedCardIndex: number | null = null;
	private energy = 0;
	private canvasW: number;
	private dockY: number;

	// Event handler refs
	private onDeckLoaded: (data: { cards: readonly DeckCardDef[] }) => void;
	private onEnergyChanged: (data: { energy: number }) => void;
	private onTowerPlaced: (data: { success: boolean }) => void;

	constructor(scene: Phaser.Scene, safeAreaBottom: number) {
		this.scene = scene;
		this.canvasW = scene.scale.width;
		this.dockY = GAME_CANVAS_H - DOCK_HEIGHT - safeAreaBottom;

		// Read initial energy from registry
		this.energy = (scene.game.registry.get('initialEnergy') as number) ?? 10;

		// Dock background - covers touch for entire dock area
		const dockBg = scene.add.rectangle(
			this.canvasW / 2,
			this.dockY + DOCK_HEIGHT / 2,
			this.canvasW,
			DOCK_HEIGHT + safeAreaBottom,
			COL_PANEL,
			0.95,
		);
		dockBg.setOrigin(0.5, 0.5);
		dockBg.setInteractive();
		// Stop propagation so touches on dock don't place towers
		dockBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
			pointer.event.stopPropagation();
		});

		// Top border line
		const borderLine = scene.add.rectangle(
			this.canvasW / 2,
			this.dockY,
			this.canvasW,
			1,
			COL_BORDER,
			1,
		);
		borderLine.setOrigin(0.5, 0.5);

		this.container = scene.add.container(0, 0, [dockBg, borderLine]);
		this.container.setDepth(100);

		// Read initial deck from registry (deck-loaded event may fire before UIScene subscribes)
		const initialDeck = scene.game.registry.get('initialDeck') as
			| readonly DeckCardDef[]
			| undefined;
		if (initialDeck && initialDeck.length > 0) {
			this.deckCards = initialDeck;
			this.buildCards();
		}

		// Bind event handlers
		this.onDeckLoaded = (data) => {
			this.deckCards = data.cards;
			this.buildCards();
		};

		this.onEnergyChanged = (data) => {
			this.energy = data.energy;
			this.updateCardAffordability();
		};

		this.onTowerPlaced = (data) => {
			if (data.success) {
				this.deselectCard();
			}
		};

		EventBus.on('deck-loaded', this.onDeckLoaded);
		EventBus.on('energy-changed', this.onEnergyChanged);
		EventBus.on('tower-placed', this.onTowerPlaced);
	}

	private buildCards(): void {
		// Clear existing cards
		for (const c of this.cardContainers) c.destroy();
		for (const t of this.glowTweens) t?.destroy();
		this.cardContainers = [];
		this.cardBorders = [];
		this.cardCostTexts = [];
		this.glowTweens = [];
		this.selectedCardIndex = null;

		const cardCount = this.deckCards.length;
		if (cardCount === 0) return;

		const totalGap = CARD_GAP * (cardCount - 1);
		const availableW = this.canvasW - CARD_PAD_X * 2;
		const cardW = Math.floor((availableW - totalGap) / cardCount);

		for (let i = 0; i < cardCount; i++) {
			const card = this.deckCards[i];
			const cardX = CARD_PAD_X + i * (cardW + CARD_GAP) + cardW / 2;
			const cardY =
				this.dockY + (DOCK_HEIGHT - CARD_HEIGHT) / 2 + CARD_HEIGHT / 2;

			// Card background
			const cardBg = this.scene.add.rectangle(
				0,
				0,
				cardW,
				CARD_HEIGHT,
				0x2a2010,
				1,
			);
			cardBg.setOrigin(0.5, 0.5);

			// Card border
			const border = this.scene.add.rectangle(0, 0, cardW, CARD_HEIGHT);
			border.setStrokeStyle(2, COL_BORDER, 1);
			border.setFillStyle(0x000000, 0);
			border.setOrigin(0.5, 0.5);

			// Tower image
			const towerType = TOWER_TYPE_MAP.get(card.towerDefId) ?? card.towerDefId;
			const towerImg = this.scene.add.image(0, -14, `tower_${towerType}`);
			towerImg.setDisplaySize(32, 32);
			towerImg.setOrigin(0.5, 0.5);
			// If texture doesn't exist, silently handle
			if (!this.scene.textures.exists(`tower_${towerType}`)) {
				towerImg.setVisible(false);
			}

			// Tower name
			const name = TOWER_NAME_MAP.get(card.towerDefId) ?? card.towerDefId;
			const nameText = this.scene.add.text(0, 12, name, {
				fontFamily: FONT_FAMILY,
				fontSize: '9px',
				color: '#f0e8d8',
				resolution: TEXT_RESOLUTION,
			});
			nameText.setOrigin(0.5, 0.5);
			// Clamp name width
			if (nameText.width > cardW - 8) {
				nameText.setScale((cardW - 8) / nameText.width);
			}

			// Energy cost
			const canAfford = this.energy >= card.energyCost;
			const costText = this.scene.add.text(0, 28, `\u26A1${card.energyCost}`, {
				fontFamily: FONT_FAMILY,
				fontSize: '11px',
				color: canAfford ? '#f0d060' : '#c03020',
				resolution: TEXT_RESOLUTION,
			});
			costText.setOrigin(0.5, 0.5);

			// Card container
			const cardContainer = this.scene.add.container(cardX, cardY, [
				cardBg,
				border,
				towerImg,
				nameText,
				costText,
			]);
			cardContainer.setSize(cardW, CARD_HEIGHT);
			cardContainer.setInteractive(
				new Phaser.Geom.Rectangle(
					-cardW / 2,
					-CARD_HEIGHT / 2,
					cardW,
					CARD_HEIGHT,
				),
				Phaser.Geom.Rectangle.Contains,
			);

			cardContainer.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
				pointer.event.stopPropagation();
				this.handleCardTap(i);
			});

			this.container.add(cardContainer);
			this.cardContainers.push(cardContainer);
			this.cardBorders.push(border);
			this.cardCostTexts.push(costText);
			this.glowTweens.push(null);
		}
	}

	private handleCardTap(index: number): void {
		if (this.selectedCardIndex === index) {
			this.deselectCard();
			EventBus.emit('request-clear-tower-selection');
		} else {
			// Deselect previous
			if (this.selectedCardIndex !== null) {
				this.setCardSelected(this.selectedCardIndex, false);
			}
			this.selectedCardIndex = index;
			this.setCardSelected(index, true);
			EventBus.emit('request-select-tower', {
				towerDefId: this.deckCards[index].towerDefId,
			});
		}
	}

	private deselectCard(): void {
		if (this.selectedCardIndex !== null) {
			this.setCardSelected(this.selectedCardIndex, false);
			this.selectedCardIndex = null;
		}
	}

	private setCardSelected(index: number, selected: boolean): void {
		const border = this.cardBorders[index];
		if (!border) return;

		if (selected) {
			border.setStrokeStyle(2, COL_GOLD, 1);
			// Glow tween
			const tween = this.scene.tweens.add({
				targets: border,
				alpha: { from: 0.6, to: 1.0 },
				duration: 400,
				yoyo: true,
				repeat: -1,
			});
			this.glowTweens[index] = tween;
		} else {
			// Stop glow
			const tween = this.glowTweens[index];
			if (tween) {
				tween.destroy();
				this.glowTweens[index] = null;
			}
			border.setAlpha(1);
			border.setStrokeStyle(2, COL_BORDER, 1);
		}
	}

	private updateCardAffordability(): void {
		for (let i = 0; i < this.deckCards.length; i++) {
			const card = this.deckCards[i];
			const canAfford = this.energy >= card.energyCost;
			const costText = this.cardCostTexts[i];
			if (costText) {
				costText.setColor(canAfford ? '#f0d060' : '#c03020');
			}
			const container = this.cardContainers[i];
			if (container) {
				container.setAlpha(canAfford ? 1 : 0.4);
			}
		}
	}

	getHeight(): number {
		return DOCK_HEIGHT;
	}

	destroy(): void {
		EventBus.off('deck-loaded', this.onDeckLoaded);
		EventBus.off('energy-changed', this.onEnergyChanged);
		EventBus.off('tower-placed', this.onTowerPlaced);
		for (const t of this.glowTweens) t?.destroy();
		this.container.destroy();
	}
}
