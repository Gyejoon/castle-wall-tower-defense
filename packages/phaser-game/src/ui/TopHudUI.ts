import {
	ENERGY_CAP,
	INITIAL_ENERGY,
	INITIAL_PLAYER_HP,
	type WavePhase,
} from '@gld/shared';
import type Phaser from 'phaser';
import { EventBus } from '../EventBus';

const HUD_HEIGHT = 44;
const HUD_PAD_X = 12;
const HUD_PAD_Y = 10;
const FONT_FAMILY = 'Galmuri11';
const TEXT_RESOLUTION = 1;

// Design token colors (0x hex)
const COL_PANEL = 0x2a2010;
const COL_BORDER = 0x4a3a20;
const COL_GOLD = 0xf0d060;
const COL_SUCCESS = 0x7ab648;

function formatTimerLabel(rawLabel: string): string {
	if (rawLabel.startsWith('Boss')) return rawLabel.replace('Boss', '보스');
	if (rawLabel.startsWith('Wave')) return rawLabel.replace('Wave', '웨이브');
	return rawLabel;
}

export class TopHudUI {
	private scene: Phaser.Scene;
	private container: Phaser.GameObjects.Container;

	// Elements
	private bgRect: Phaser.GameObjects.Rectangle;
	private hpText: Phaser.GameObjects.Text;
	private energyText: Phaser.GameObjects.Text;
	private energyBarBg: Phaser.GameObjects.Rectangle;
	private energyBarFill: Phaser.GameObjects.Rectangle;
	private timerText: Phaser.GameObjects.Text;
	private speedBtn: Phaser.GameObjects.Text;

	// State
	private hp = INITIAL_PLAYER_HP;
	private energy = INITIAL_ENERGY;
	private timerLabel = 'Slot 1';
	private isBossPhase = false;
	private bossWarning = false;
	private waitCountdown = 0;
	private waitTimer: Phaser.Time.TimerEvent | null = null;
	private gameSpeed: 1 | 2 = 1;
	private speed2xUnlocked = false;
	private running = false;
	private canvasW: number;

	// Event handler refs for cleanup
	private onDamaged: (data: { remainingHp: number }) => void;
	private onEnergyChanged: (data: { energy: number }) => void;
	private onWaveStarted: (data: {
		wave: number;
		totalWaves: number;
		slotIndex: number;
		phase: WavePhase;
		kind: string;
		startAtSec: number;
	}) => void;
	private onWaveCompleted: (data: {
		wave: number;
		totalWaves: number;
		delaySec: number;
	}) => void;
	private onBossWarning: () => void;
	private onBossDefeated: () => void;
	private onSetSpeed: (data: { multiplier: 1 | 2 }) => void;

	constructor(scene: Phaser.Scene) {
		this.scene = scene;
		this.canvasW = scene.scale.width;

		// Read initial values from registry
		this.hp =
			(scene.game.registry.get('initialLives') as number) ?? INITIAL_PLAYER_HP;
		this.energy =
			(scene.game.registry.get('initialEnergy') as number) ?? INITIAL_ENERGY;
		this.speed2xUnlocked =
			(scene.game.registry.get('speed2xUnlocked') as boolean) ?? false;

		// Background
		this.bgRect = scene.add.rectangle(
			this.canvasW / 2,
			HUD_HEIGHT / 2,
			this.canvasW,
			HUD_HEIGHT,
			COL_PANEL,
			0.92,
		);
		this.bgRect.setOrigin(0.5, 0.5);

		// Bottom border line
		const borderLine = scene.add.rectangle(
			this.canvasW / 2,
			HUD_HEIGHT,
			this.canvasW,
			1,
			COL_BORDER,
			1,
		);
		borderLine.setOrigin(0.5, 0.5);

		// HP text
		this.hpText = scene.add.text(HUD_PAD_X, HUD_PAD_Y, `HP ${this.hp}`, {
			fontFamily: FONT_FAMILY,
			fontSize: '14px',
			color: '#c03020',
			resolution: TEXT_RESOLUTION,
		});
		this.hpText.setOrigin(0, 0);

		// Energy text
		const energyX = HUD_PAD_X + 60;
		this.energyText = scene.add.text(
			energyX,
			HUD_PAD_Y,
			`\u26A1${this.energy}`,
			{
				fontFamily: FONT_FAMILY,
				fontSize: '14px',
				color: '#f0d060',
				resolution: TEXT_RESOLUTION,
			},
		);
		this.energyText.setOrigin(0, 0);

		// Energy bar background
		const barX = energyX + 52;
		const barY = HUD_PAD_Y + 6;
		const barW = 60;
		const barH = 4;
		this.energyBarBg = scene.add.rectangle(
			barX,
			barY,
			barW,
			barH,
			0x000000,
			0.3,
		);
		this.energyBarBg.setOrigin(0, 0);

		// Energy bar fill
		const fillW = Math.min(barW, (this.energy / ENERGY_CAP) * barW);
		this.energyBarFill = scene.add.rectangle(
			barX,
			barY,
			fillW,
			barH,
			COL_GOLD,
			1,
		);
		this.energyBarFill.setOrigin(0, 0);

		// Timer text
		const timerX = barX + barW + 12;
		this.timerText = scene.add.text(
			timerX,
			HUD_PAD_Y,
			formatTimerLabel(this.timerLabel),
			{
				fontFamily: FONT_FAMILY,
				fontSize: '14px',
				color: '#f0e8d8',
				resolution: TEXT_RESOLUTION,
			},
		);
		this.timerText.setOrigin(0, 0);

		// Speed button (hidden by default)
		this.speedBtn = scene.add.text(
			this.canvasW - HUD_PAD_X,
			HUD_PAD_Y,
			'1x \u25B6',
			{
				fontFamily: FONT_FAMILY,
				fontSize: '11px',
				color: '#a09070',
				resolution: TEXT_RESOLUTION,
			},
		);
		this.speedBtn.setOrigin(1, 0);
		this.speedBtn.setInteractive({ useHandCursor: true });
		this.speedBtn.on('pointerdown', () => {
			const newSpeed: 1 | 2 = this.gameSpeed === 1 ? 2 : 1;
			EventBus.emit('request-set-speed', { multiplier: newSpeed });
		});
		this.speedBtn.setVisible(false);

		// Container
		this.container = scene.add.container(0, 0, [
			this.bgRect,
			borderLine,
			this.hpText,
			this.energyText,
			this.energyBarBg,
			this.energyBarFill,
			this.timerText,
			this.speedBtn,
		]);
		this.container.setDepth(100);

		// Bind event handlers
		this.onDamaged = (data) => {
			this.hp = data.remainingHp;
			this.hpText.setText(`HP ${this.hp}`);
			if (this.hp <= 3) {
				this.startHpBlink();
			}
		};

		this.onEnergyChanged = (data) => {
			this.energy = data.energy;
			this.energyText.setText(`\u26A1${this.energy}`);
			const targetW = Math.min(barW, (this.energy / ENERGY_CAP) * barW);
			const fillColor = this.energy >= ENERGY_CAP ? COL_SUCCESS : COL_GOLD;
			this.energyBarFill.setFillStyle(fillColor, 1);
			scene.tweens.add({
				targets: this.energyBarFill,
				displayWidth: targetW,
				duration: 200,
				ease: 'Cubic.easeOut',
			});
		};

		this.onWaveStarted = (data) => {
			this.running = true;
			this.waitCountdown = 0;
			if (this.waitTimer) {
				this.waitTimer.destroy();
				this.waitTimer = null;
			}
			this.bossWarning = data.kind === 'pre_boss';
			this.isBossPhase = data.phase === 'boss' || this.bossWarning;
			if (data.phase === 'boss') {
				this.timerLabel = `Boss ${data.slotIndex}`;
			} else if (data.kind === 'pre_boss') {
				this.timerLabel = 'Boss Soon';
			} else {
				this.timerLabel = `Wave ${data.wave}/${data.totalWaves}`;
			}
			this.updateTimerDisplay();
			this.updateSpeedButton();
		};

		this.onWaveCompleted = (data) => {
			if (data.wave < data.totalWaves) {
				this.waitCountdown = data.delaySec;
				this.timerLabel = `Wave ${data.wave}/${data.totalWaves}`;
				this.isBossPhase = false;
				this.bossWarning = false;
				this.updateTimerDisplay();
				if (this.waitTimer) this.waitTimer.destroy();
				this.waitTimer = scene.time.addEvent({
					delay: 1000,
					repeat: data.delaySec - 1,
					callback: () => {
						this.waitCountdown = Math.max(0, this.waitCountdown - 1);
						this.updateTimerDisplay();
					},
				});
			}
		};

		this.onBossWarning = () => {
			this.bossWarning = true;
			this.isBossPhase = true;
			this.updateTimerDisplay();
		};

		this.onBossDefeated = () => {
			this.isBossPhase = false;
			this.bossWarning = false;
			this.updateTimerDisplay();
		};

		this.onSetSpeed = (data) => {
			this.gameSpeed = data.multiplier;
			this.updateSpeedButton();
		};

		// Register EventBus listeners
		EventBus.on('player-damaged', this.onDamaged);
		EventBus.on('energy-changed', this.onEnergyChanged);
		EventBus.on('wave-started', this.onWaveStarted);
		EventBus.on('wave-completed', this.onWaveCompleted);
		EventBus.on('boss-warning', this.onBossWarning);
		EventBus.on('boss-defeated', this.onBossDefeated);
		EventBus.on('request-set-speed', this.onSetSpeed);
	}

	private startHpBlink(): void {
		// Don't add duplicate tweens
		if (this.scene.tweens.isTweening(this.hpText)) return;
		this.scene.tweens.add({
			targets: this.hpText,
			alpha: { from: 1.0, to: 0.4 },
			duration: 600,
			yoyo: true,
			repeat: -1,
		});
	}

	private updateTimerDisplay(): void {
		if (this.bossWarning) {
			this.timerText.setText('보스 임박');
			this.timerText.setColor('#f0d060');
		} else if (this.waitCountdown > 0) {
			this.timerText.setText(`다음 ${this.waitCountdown}s`);
			this.timerText.setColor('#f0e8d8');
		} else {
			this.timerText.setText(formatTimerLabel(this.timerLabel));
			this.timerText.setColor(this.isBossPhase ? '#f0d060' : '#f0e8d8');
		}
	}

	private updateSpeedButton(): void {
		const show = this.running && this.speed2xUnlocked;
		this.speedBtn.setVisible(show);
		if (show) {
			this.speedBtn.setText(
				this.gameSpeed === 2 ? '2x \u25B6\u25B6' : '1x \u25B6',
			);
			this.speedBtn.setColor(this.gameSpeed === 2 ? '#c87020' : '#a09070');
		}
	}

	getHeight(): number {
		return HUD_HEIGHT;
	}

	destroy(): void {
		EventBus.off('player-damaged', this.onDamaged);
		EventBus.off('energy-changed', this.onEnergyChanged);
		EventBus.off('wave-started', this.onWaveStarted);
		EventBus.off('wave-completed', this.onWaveCompleted);
		EventBus.off('boss-warning', this.onBossWarning);
		EventBus.off('boss-defeated', this.onBossDefeated);
		EventBus.off('request-set-speed', this.onSetSpeed);
		if (this.waitTimer) {
			this.waitTimer.destroy();
			this.waitTimer = null;
		}
		this.container.destroy();
	}
}
