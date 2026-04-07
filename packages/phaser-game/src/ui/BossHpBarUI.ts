import type Phaser from 'phaser';
import { EventBus } from '../EventBus';

const FONT_FAMILY = 'Galmuri11';
const TEXT_RESOLUTION = 1;
const BAR_HEIGHT = 8;
const BAR_PAD_X = 12;
const PANEL_HEIGHT = 36;

const COL_PANEL_BG = 0x1a1208;
const COL_BORDER = 0x4a3a20;
const COL_PHASE1 = 0xc87020;
const COL_PHASE2 = 0xc03020;

export class BossHpBarUI {
	private scene: Phaser.Scene;
	private container: Phaser.GameObjects.Container;

	// Elements
	private panelBg: Phaser.GameObjects.Rectangle;
	private borderRect: Phaser.GameObjects.Rectangle;
	private nameText: Phaser.GameObjects.Text;
	private phaseText: Phaser.GameObjects.Text;
	private barBg: Phaser.GameObjects.Rectangle;
	private barFill: Phaser.GameObjects.Rectangle;
	private barBorder: Phaser.GameObjects.Rectangle;
	private hpNumText: Phaser.GameObjects.Text;

	// State
	private hp = 0;
	private maxHp = 0;
	private phase: 1 | 2 = 1;
	private visible = false;
	private pulseTween: Phaser.Tweens.Tween | null = null;

	// Event handler refs
	private onBossHpUpdate: (data: {
		hp: number;
		maxHp: number;
		phase: 1 | 2;
	}) => void;
	private onBossDefeated: () => void;
	private onBossPhaseChange: (data: { phase: 1 | 2 }) => void;

	private canvasW: number;
	private topOffset: number;

	constructor(scene: Phaser.Scene, topOffset: number) {
		this.scene = scene;
		this.canvasW = scene.scale.width;
		this.topOffset = topOffset;

		const panelW = this.canvasW - BAR_PAD_X * 2;
		const panelX = this.canvasW / 2;
		const panelY = topOffset + PANEL_HEIGHT / 2;

		// Panel background
		this.panelBg = scene.add.rectangle(
			panelX,
			panelY,
			panelW,
			PANEL_HEIGHT,
			COL_PANEL_BG,
			0.88,
		);
		this.panelBg.setOrigin(0.5, 0.5);

		// Panel border
		this.borderRect = scene.add.rectangle(panelX, panelY, panelW, PANEL_HEIGHT);
		this.borderRect.setStrokeStyle(1, COL_BORDER, 1);
		this.borderRect.setFillStyle(0x000000, 0);
		this.borderRect.setOrigin(0.5, 0.5);

		// Boss name text
		const innerPad = 8;
		const leftX = BAR_PAD_X + innerPad;
		const topY = topOffset + 6;
		this.nameText = scene.add.text(leftX, topY, '고대 드래곤', {
			fontFamily: FONT_FAMILY,
			fontSize: '12px',
			color: '#f0d060',
			resolution: TEXT_RESOLUTION,
		});
		this.nameText.setOrigin(0, 0);

		// Phase text
		const rightX = this.canvasW - BAR_PAD_X - innerPad;
		this.phaseText = scene.add.text(rightX, topY, 'Phase 1', {
			fontFamily: FONT_FAMILY,
			fontSize: '11px',
			color: '#a09070',
			resolution: TEXT_RESOLUTION,
		});
		this.phaseText.setOrigin(1, 0);

		// HP bar background
		const barY = topY + 16;
		const barW = panelW - innerPad * 2;
		this.barBg = scene.add.rectangle(
			leftX,
			barY,
			barW,
			BAR_HEIGHT,
			0x000000,
			0.5,
		);
		this.barBg.setOrigin(0, 0);

		// HP bar fill
		this.barFill = scene.add.rectangle(
			leftX,
			barY,
			0,
			BAR_HEIGHT,
			COL_PHASE1,
			1,
		);
		this.barFill.setOrigin(0, 0);

		// HP bar border
		this.barBorder = scene.add.rectangle(leftX, barY, barW, BAR_HEIGHT);
		this.barBorder.setStrokeStyle(1, COL_BORDER, 1);
		this.barBorder.setFillStyle(0x000000, 0);
		this.barBorder.setOrigin(0, 0);

		// HP number text
		this.hpNumText = scene.add.text(rightX, barY + BAR_HEIGHT + 2, '0/0', {
			fontFamily: FONT_FAMILY,
			fontSize: '11px',
			color: '#a09070',
			resolution: TEXT_RESOLUTION,
		});
		this.hpNumText.setOrigin(1, 0);

		// Container
		this.container = scene.add.container(0, 0, [
			this.panelBg,
			this.borderRect,
			this.nameText,
			this.phaseText,
			this.barBg,
			this.barFill,
			this.barBorder,
			this.hpNumText,
		]);
		this.container.setDepth(100);
		this.container.setAlpha(0);
		this.container.setVisible(false);

		// Bind event handlers
		this.onBossHpUpdate = (data) => {
			this.hp = data.hp;
			this.maxHp = data.maxHp;
			this.phase = data.phase;
			this.updateBar();
			if (!this.visible) {
				this.show();
			}
		};

		this.onBossDefeated = () => {
			this.hide();
		};

		this.onBossPhaseChange = (data) => {
			this.phase = data.phase;
			this.updatePhaseDisplay();
		};

		EventBus.on('boss-hp-update', this.onBossHpUpdate);
		EventBus.on('boss-defeated', this.onBossDefeated);
		EventBus.on('boss-phase-change', this.onBossPhaseChange);
	}

	private show(): void {
		this.visible = true;
		this.container.setVisible(true);
		this.container.setY(-20);
		this.scene.tweens.add({
			targets: this.container,
			alpha: 1,
			y: 0,
			duration: 300,
			ease: 'Power2',
		});
	}

	private hide(): void {
		this.scene.tweens.add({
			targets: this.container,
			alpha: 0,
			duration: 200,
			ease: 'Power2',
			onComplete: () => {
				this.visible = false;
				this.container.setVisible(false);
				this.hp = 0;
				this.maxHp = 0;
				this.phase = 1;
				this.stopPulse();
			},
		});
	}

	private updateBar(): void {
		const panelW = this.canvasW - BAR_PAD_X * 2;
		const innerPad = 8;
		const barW = panelW - innerPad * 2;
		const pct = this.maxHp > 0 ? Math.max(0, this.hp / this.maxHp) : 0;
		const targetW = Math.max(0, pct * barW);

		const fillColor = this.phase === 2 ? COL_PHASE2 : COL_PHASE1;
		this.barFill.setFillStyle(fillColor, 1);

		this.scene.tweens.add({
			targets: this.barFill,
			displayWidth: targetW,
			duration: 200,
			ease: 'Cubic.easeOut',
		});

		this.hpNumText.setText(`${this.hp}/${this.maxHp}`);
		this.updatePhaseDisplay();
	}

	private updatePhaseDisplay(): void {
		this.phaseText.setText(this.phase === 2 ? 'Phase 2' : 'Phase 1');
		this.nameText.setColor(this.phase === 2 ? '#c03020' : '#f0d060');

		if (this.phase === 2 && !this.pulseTween) {
			this.pulseTween = this.scene.tweens.add({
				targets: this.barFill,
				alpha: { from: 1, to: 0.6 },
				duration: 800,
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut',
			});
		} else if (this.phase === 1) {
			this.stopPulse();
		}
	}

	private stopPulse(): void {
		if (this.pulseTween) {
			this.pulseTween.destroy();
			this.pulseTween = null;
			this.barFill.setAlpha(1);
		}
	}

	getHeight(): number {
		return this.visible ? PANEL_HEIGHT + 4 : 0;
	}

	destroy(): void {
		EventBus.off('boss-hp-update', this.onBossHpUpdate);
		EventBus.off('boss-defeated', this.onBossDefeated);
		EventBus.off('boss-phase-change', this.onBossPhaseChange);
		this.stopPulse();
		this.container.destroy();
	}
}
