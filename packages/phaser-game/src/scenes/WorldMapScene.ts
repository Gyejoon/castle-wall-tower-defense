import { isMapUnlocked, MAP_REGISTRY } from '@gld/shared';
import Phaser from 'phaser';
import {
	LOCKED_THEME,
	MAP_THEMES,
	NODE_POSITIONS,
} from '../constants/mapThemes';
import { EventBus } from '../EventBus';

export class WorldMapScene extends Phaser.Scene {
	private isTransitioning = false;

	constructor() {
		super('WorldMap');
	}

	create() {
		this.events.on('shutdown', this.onShutdown, this);
		const { width, height } = this.scale;
		const playerLevel = (this.game.registry.get('playerLevel') as number) ?? 1;
		const stagesCleared =
			(this.game.registry.get('stagesCleared') as string[]) ?? [];

		this.isTransitioning = false;

		// Background gradient
		this.drawBackground(width, height);

		// Decorative stars
		this.createStars(width, height);

		// Draw paths between nodes
		this.drawPaths(width, height);

		// Create nodes for each map
		const mapEntries = Object.values(MAP_REGISTRY);
		for (const map of mapEntries) {
			const pos = NODE_POSITIONS[map.id];
			if (!pos) {
				console.warn(
					`[WorldMap] No node position for map "${map.id}", skipping`,
				);
				continue;
			}

			const nx = width * pos.x;
			const ny = height * pos.y;
			const locked = !isMapUnlocked(map, playerLevel);
			const cleared = stagesCleared.includes(map.id);

			this.createNode(
				map.id,
				map.name,
				nx,
				ny,
				locked,
				cleared,
				map.unlockLevel,
			);
		}

		// Back button
		const backBtn = this.add
			.text(16, 16, '← 돌아가기', {
				fontFamily: '"Press Start 2P"',
				fontSize: '10px',
				color: '#c8a04a',
			})
			.setInteractive({ useHandCursor: true })
			.on('pointerdown', () => {
				EventBus.emit('request-enter-lobby');
			});
		backBtn.on('pointerover', () => backBtn.setColor('#f0d060'));
		backBtn.on('pointerout', () => backBtn.setColor('#c8a04a'));

		// Title
		this.add
			.text(width / 2, 20, '스테이지 선택', {
				fontFamily: '"Press Start 2P"',
				fontSize: '13px',
				color: '#f0d060',
			})
			.setOrigin(0.5, 0);

		// Player level display
		this.add
			.text(width - 16, 16, `Lv.${playerLevel}`, {
				fontFamily: '"Press Start 2P"',
				fontSize: '10px',
				color: '#a09070',
			})
			.setOrigin(1, 0);

		EventBus.emit('stage-select-ready');
	}

	private drawBackground(w: number, h: number) {
		const bg = this.add.graphics();
		bg.fillStyle(0x1a1208, 1);
		bg.fillRect(0, 0, w, h);

		// Forest area glow (bottom)
		bg.fillStyle(0x225022, 0.3);
		bg.fillCircle(w * 0.5, h * 0.8, w * 0.4);

		// Lava area glow (middle-left)
		bg.fillStyle(0x782814, 0.2);
		bg.fillCircle(w * 0.25, h * 0.5, w * 0.3);

		// Storm area glow (top-right)
		bg.fillStyle(0x3c3c64, 0.3);
		bg.fillCircle(w * 0.72, h * 0.22, w * 0.3);
	}

	private createStars(w: number, h: number) {
		for (let i = 0; i < 20; i++) {
			const x = Phaser.Math.Between(0, w);
			const y = Phaser.Math.Between(0, h * 0.6);
			const star = this.add.graphics();
			star.fillStyle(0xf0e8d8, 0.3);
			star.fillCircle(x, y, 1);

			this.tweens.add({
				targets: star,
				alpha: { from: 0.1, to: 0.6 },
				duration: Phaser.Math.Between(2000, 4000),
				yoyo: true,
				repeat: -1,
				delay: Phaser.Math.Between(0, 2000),
			});
		}
	}

	private drawPaths(w: number, h: number) {
		const gfx = this.add.graphics();
		gfx.lineStyle(3, 0x4a3a20, 0.6);

		const mapIds = Object.keys(NODE_POSITIONS);
		for (let i = 0; i < mapIds.length - 1; i++) {
			const a = NODE_POSITIONS[mapIds[i]];
			const b = NODE_POSITIONS[mapIds[i + 1]];
			if (!a || !b) continue;
			this.drawDashedLine(gfx, w * a.x, h * a.y, w * b.x, h * b.y, 8, 6);
		}
	}

	private drawDashedLine(
		gfx: Phaser.GameObjects.Graphics,
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		dashLen: number,
		gapLen: number,
	) {
		const dx = x2 - x1;
		const dy = y2 - y1;
		const dist = Math.sqrt(dx * dx + dy * dy);
		const nx = dx / dist;
		const ny = dy / dist;
		let d = 0;
		let drawing = true;
		while (d < dist) {
			const segLen = drawing ? dashLen : gapLen;
			const end = Math.min(d + segLen, dist);
			if (drawing) {
				gfx.beginPath();
				gfx.moveTo(x1 + nx * d, y1 + ny * d);
				gfx.lineTo(x1 + nx * end, y1 + ny * end);
				gfx.strokePath();
			}
			d = end;
			drawing = !drawing;
		}
	}

	private createNode(
		mapId: string,
		name: string,
		x: number,
		y: number,
		locked: boolean,
		cleared: boolean,
		unlockLevel?: number,
	): Phaser.GameObjects.Container {
		const container = this.add.container(x, y);
		const theme = locked ? LOCKED_THEME : (MAP_THEMES[mapId] ?? LOCKED_THEME);
		const radius = 32;

		// Circle background
		const circle = this.add.graphics();
		circle.fillStyle(theme.start, 1);
		circle.fillCircle(0, 0, radius);
		circle.lineStyle(2, theme.border, 1);
		circle.strokeCircle(0, 0, radius);
		container.add(circle);

		// Emoji icon
		const emoji = locked ? '🔒' : (MAP_THEMES[mapId]?.emoji ?? '❓');
		const icon = this.add
			.text(0, 0, emoji, { fontSize: '24px' })
			.setOrigin(0.5);
		container.add(icon);

		// Map name
		const nameText = this.add
			.text(0, radius + 10, name, {
				fontFamily: '"Press Start 2P"',
				fontSize: '10px',
				color: locked ? '#707070' : '#f0e8d8',
			})
			.setOrigin(0.5, 0);
		container.add(nameText);

		// Level badge
		const level = unlockLevel ?? 1;
		if (locked) {
			const lockText = this.add
				.text(0, radius + 26, `Lv.${level} 해금`, {
					fontFamily: '"Press Start 2P"',
					fontSize: '8px',
					color: '#c03020',
					backgroundColor: 'rgba(0,0,0,0.6)',
					padding: { x: 4, y: 2 },
				})
				.setOrigin(0.5, 0);
			container.add(lockText);
		} else {
			const lvText = this.add
				.text(0, radius + 26, `Lv.${level}`, {
					fontFamily: '"Press Start 2P"',
					fontSize: '8px',
					color: '#c8a04a',
					backgroundColor: 'rgba(26,18,8,0.85)',
					padding: { x: 4, y: 2 },
				})
				.setOrigin(0.5, 0);
			container.add(lvText);
		}

		// Clear badge
		if (cleared && !locked) {
			const badge = this.add.graphics();
			badge.fillStyle(0xf0d060, 1);
			badge.fillCircle(radius - 4, -radius + 4, 9);
			container.add(badge);

			const checkmark = this.add
				.text(radius - 4, -radius + 4, '✓', {
					fontSize: '8px',
					color: '#1a1208',
				})
				.setOrigin(0.5);
			container.add(checkmark);
		}

		// Opacity for locked
		if (locked) {
			container.setAlpha(0.35);
		}

		// Pulse animation for unlocked, uncleared nodes
		if (!locked && !cleared) {
			const pulseCircle = this.add.graphics();
			pulseCircle.lineStyle(2, theme.border, 0.4);
			pulseCircle.strokeCircle(0, 0, radius + 4);
			container.add(pulseCircle);

			this.tweens.add({
				targets: pulseCircle,
				scaleX: 1.15,
				scaleY: 1.15,
				alpha: 0.1,
				duration: 2000,
				yoyo: true,
				repeat: -1,
				ease: 'Sine.easeInOut',
			});
		}

		// Interaction
		container.setSize(radius * 2 + 20, radius * 2 + 50);
		container.setInteractive({ useHandCursor: !locked });

		if (!locked) {
			container.on('pointerover', () => {
				this.tweens.add({
					targets: container,
					scaleX: 1.1,
					scaleY: 1.1,
					duration: 200,
					ease: 'Back.easeOut',
				});
			});

			container.on('pointerout', () => {
				this.tweens.add({
					targets: container,
					scaleX: 1,
					scaleY: 1,
					duration: 200,
					ease: 'Sine.easeOut',
				});
			});

			container.on('pointerdown', () => {
				if (this.isTransitioning) return;
				this.isTransitioning = true;

				// Zoom into the node
				this.cameras.main.zoomTo(2, 600, 'Sine.easeInOut');
				this.cameras.main.pan(x, y, 600, 'Sine.easeInOut');

				this.time.delayedCall(650, () => {
					this.scene.start('StageDetail', { mapId });
				});
			});
		} else {
			container.on('pointerdown', () => {
				// Shake animation for locked node
				this.tweens.add({
					targets: container,
					x: { from: x - 4, to: x + 4 },
					duration: 60,
					yoyo: true,
					repeat: 3,
					onComplete: () => container.setX(x),
				});
			});
		}

		return container;
	}

	private onShutdown() {
		this.isTransitioning = false;
		this.events.off('shutdown', this.onShutdown, this);
	}
}
