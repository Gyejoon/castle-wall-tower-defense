import { isMapUnlocked, MAP_REGISTRY } from '@gld/shared';
import Phaser from 'phaser';
import {
	LOCKED_THEME,
	MAP_THEMES,
	NODE_POSITIONS,
} from '../constants/mapThemes';
import { EventBus } from '../EventBus';

// Pixel-art color palette (from .impeccable.md)
const C = {
	bg: 0x1a1208,
	panel: 0x2a2010,
	border: 0x4a3a20,
	accent: 0xc8a04a,
	gold: 0xf0d060,
	text: 0xf0e8d8,
	textSec: 0xa09070,
	danger: 0xc03020,
	shadow: 0x0a0804,
};

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

		this.drawBackground(width, height);
		this.createStarField(width, height);
		this.drawPaths(width, height);

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

		this.createHeader(width, playerLevel);
		EventBus.emit('stage-select-ready');
	}

	// ─── Background ───────────────────────────────────

	private drawBackground(w: number, h: number) {
		const bg = this.add.graphics();

		// Base dark fill
		bg.fillStyle(C.bg, 1);
		bg.fillRect(0, 0, w, h);

		// Subtle terrain zones (small, soft glows instead of huge blobs)
		// Forest (bottom)
		for (let i = 0; i < 3; i++) {
			const alpha = 0.06 - i * 0.015;
			bg.fillStyle(0x1a3a10, alpha);
			bg.fillCircle(w * 0.5, h * 0.82 - i * 20, 140 + i * 30);
		}

		// Lava (middle-left)
		for (let i = 0; i < 3; i++) {
			const alpha = 0.05 - i * 0.012;
			bg.fillStyle(0x3a1808, alpha);
			bg.fillCircle(w * 0.25, h * 0.52 - i * 15, 110 + i * 25);
		}

		// Storm (top-right)
		for (let i = 0; i < 3; i++) {
			const alpha = 0.06 - i * 0.015;
			bg.fillStyle(0x1a2040, alpha);
			bg.fillCircle(w * 0.72, h * 0.24 - i * 15, 120 + i * 25);
		}

		// Horizontal scan lines (pixel CRT feel)
		bg.lineStyle(1, 0x000000, 0.03);
		for (let y = 0; y < h; y += 4) {
			bg.moveTo(0, y);
			bg.lineTo(w, y);
		}
		bg.strokePath();
	}

	private createStarField(w: number, h: number) {
		for (let i = 0; i < 30; i++) {
			const x = Phaser.Math.Between(8, w - 8);
			const y = Phaser.Math.Between(8, h * 0.7);
			const size = Phaser.Math.FloatBetween(0.5, 1.5);

			const star = this.add.graphics();
			star.fillStyle(C.text, 0.15);
			star.fillRect(x, y, size, size); // pixel dots, not circles

			this.tweens.add({
				targets: star,
				alpha: { from: 0.05, to: 0.35 },
				duration: Phaser.Math.Between(2000, 5000),
				yoyo: true,
				repeat: -1,
				delay: Phaser.Math.Between(0, 3000),
			});
		}
	}

	// ─── Paths ────────────────────────────────────────

	private drawPaths(w: number, h: number) {
		const mapIds = Object.keys(NODE_POSITIONS);

		for (let i = 0; i < mapIds.length - 1; i++) {
			const a = NODE_POSITIONS[mapIds[i]];
			const b = NODE_POSITIONS[mapIds[i + 1]];
			if (!a || !b) continue;

			const ax = w * a.x;
			const ay = h * a.y;
			const bx = w * b.x;
			const by = h * b.y;

			// Shadow path (offset)
			this.drawDashedLine(ax + 1, ay + 1, bx + 1, by + 1, C.shadow, 0.3, 2);
			// Main path
			this.drawDashedLine(ax, ay, bx, by, C.border, 0.5, 2);
			// Bright highlight dots along path
			this.drawPathDots(ax, ay, bx, by);
		}
	}

	private drawDashedLine(
		x1: number,
		y1: number,
		x2: number,
		y2: number,
		color: number,
		alpha: number,
		width: number,
	) {
		const gfx = this.add.graphics();
		gfx.lineStyle(width, color, alpha);

		const dx = x2 - x1;
		const dy = y2 - y1;
		const dist = Math.sqrt(dx * dx + dy * dy);
		const nx = dx / dist;
		const ny = dy / dist;
		let d = 0;
		let drawing = true;

		while (d < dist) {
			const segLen = drawing ? 6 : 8;
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

	private drawPathDots(x1: number, y1: number, x2: number, y2: number) {
		const dx = x2 - x1;
		const dy = y2 - y1;
		const dist = Math.sqrt(dx * dx + dy * dy);
		const steps = Math.max(1, Math.floor(dist / 24));

		for (let i = 0; i <= steps; i++) {
			const t = i / steps;
			const x = x1 + dx * t;
			const y = y1 + dy * t;

			const dot = this.add.graphics();
			dot.fillStyle(C.accent, 0.2);
			dot.fillRect(x - 1, y - 1, 2, 2);

			this.tweens.add({
				targets: dot,
				alpha: { from: 0.1, to: 0.4 },
				duration: 1500,
				yoyo: true,
				repeat: -1,
				delay: i * 120,
			});
		}
	}

	// ─── Header ───────────────────────────────────────

	private createHeader(w: number, level: number) {
		// Header bar background
		const hdr = this.add.graphics();
		hdr.fillStyle(C.panel, 0.9);
		hdr.fillRect(0, 0, w, 40);
		hdr.lineStyle(1, C.border, 0.6);
		hdr.moveTo(0, 40);
		hdr.lineTo(w, 40);
		hdr.strokePath();

		// Back button
		const backBtn = this.add
			.text(12, 20, '← 돌아가기', {
				fontFamily: '"Press Start 2P"',
				fontSize: '9px',
				color: '#c8a04a',
			})
			.setOrigin(0, 0.5)
			.setInteractive({ useHandCursor: true })
			.on('pointerdown', () => EventBus.emit('request-enter-lobby'));
		backBtn.on('pointerover', () => backBtn.setColor('#f0d060'));
		backBtn.on('pointerout', () => backBtn.setColor('#c8a04a'));

		// Title
		this.add
			.text(w / 2, 20, '스테이지 선택', {
				fontFamily: '"Press Start 2P"',
				fontSize: '11px',
				color: '#f0d060',
			})
			.setOrigin(0.5);

		// Level badge
		const lvBg = this.add.graphics();
		lvBg.fillStyle(C.panel, 1);
		lvBg.fillRect(w - 64, 10, 52, 20);
		lvBg.lineStyle(1, C.border, 0.8);
		lvBg.strokeRect(w - 64, 10, 52, 20);

		this.add
			.text(w - 38, 20, `Lv.${level}`, {
				fontFamily: '"Press Start 2P"',
				fontSize: '9px',
				color: '#a09070',
			})
			.setOrigin(0.5);
	}

	// ─── Node ─────────────────────────────────────────

	private createNode(
		mapId: string,
		name: string,
		x: number,
		y: number,
		locked: boolean,
		cleared: boolean,
		unlockLevel?: number,
	) {
		const container = this.add.container(x, y);
		const theme = locked ? LOCKED_THEME : (MAP_THEMES[mapId] ?? LOCKED_THEME);
		const nodeSize = 36;

		// ── Card frame ──
		const cardW = 96;
		const cardH = 96;

		// Drop shadow
		const shadow = this.add.graphics();
		shadow.fillStyle(C.shadow, 0.4);
		shadow.fillRect(-cardW / 2 + 3, -cardH / 2 + 3, cardW, cardH);
		container.add(shadow);

		// Card background
		const card = this.add.graphics();
		card.fillStyle(C.panel, 0.95);
		card.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);
		// Border (double pixel border)
		card.lineStyle(2, C.border, 0.9);
		card.strokeRect(-cardW / 2, -cardH / 2, cardW, cardH);
		card.lineStyle(1, theme.border, 0.4);
		card.strokeRect(-cardW / 2 + 3, -cardH / 2 + 3, cardW - 6, cardH - 6);
		container.add(card);

		// ── Icon area ──
		const iconBg = this.add.graphics();
		// Theme-colored circle with inner glow
		iconBg.fillStyle(theme.start, 0.9);
		iconBg.fillCircle(0, -12, nodeSize / 2);
		// Highlight ring
		iconBg.lineStyle(2, theme.border, 0.8);
		iconBg.strokeCircle(0, -12, nodeSize / 2);
		// Inner light (top-left highlight for depth)
		iconBg.fillStyle(0xffffff, 0.08);
		iconBg.fillCircle(-4, -16, nodeSize / 4);
		container.add(iconBg);

		// Icon character (using pixel-style text symbols instead of emoji)
		const iconChar = locked ? '✕' : this.getMapIcon(mapId);
		const icon = this.add
			.text(0, -12, iconChar, {
				fontFamily: '"Press Start 2P"',
				fontSize: locked ? '14px' : '16px',
				color: locked ? '#606060' : '#f0e8d8',
			})
			.setOrigin(0.5);
		container.add(icon);

		// ── Map name ──
		const nameText = this.add
			.text(0, 18, name, {
				fontFamily: '"Press Start 2P"',
				fontSize: '8px',
				color: locked ? '#606060' : '#f0e8d8',
			})
			.setOrigin(0.5, 0);
		container.add(nameText);

		// ── Level badge ──
		const level = unlockLevel ?? 1;
		const lvBadge = this.add.graphics();
		const badgeW = locked ? 56 : 36;
		lvBadge.fillStyle(locked ? 0x301010 : C.panel, 0.9);
		lvBadge.fillRect(-badgeW / 2, 30, badgeW, 14);
		lvBadge.lineStyle(1, locked ? 0x802020 : C.border, 0.7);
		lvBadge.strokeRect(-badgeW / 2, 30, badgeW, 14);
		container.add(lvBadge);

		const lvText = this.add
			.text(0, 37, locked ? `Lv.${level} 해금` : `Lv.${level}`, {
				fontFamily: '"Press Start 2P"',
				fontSize: '7px',
				color: locked ? '#c03020' : '#c8a04a',
			})
			.setOrigin(0.5);
		container.add(lvText);

		// ── Clear badge ──
		if (cleared && !locked) {
			const badgeBg = this.add.graphics();
			badgeBg.fillStyle(C.gold, 1);
			badgeBg.fillRect(cardW / 2 - 16, -cardH / 2 - 2, 18, 14);
			badgeBg.lineStyle(1, C.accent, 1);
			badgeBg.strokeRect(cardW / 2 - 16, -cardH / 2 - 2, 18, 14);
			container.add(badgeBg);

			const check = this.add
				.text(cardW / 2 - 7, -cardH / 2 + 5, '✓', {
					fontFamily: '"Press Start 2P"',
					fontSize: '7px',
					color: '#1a1208',
				})
				.setOrigin(0.5);
			container.add(check);
		}

		// ── Locked overlay ──
		if (locked) {
			container.setAlpha(0.45);
		}

		// ── Pulse ring for available, uncleared ──
		if (!locked && !cleared) {
			const pulse = this.add.graphics();
			pulse.lineStyle(1, theme.border, 0.3);
			pulse.strokeCircle(0, -12, nodeSize / 2 + 6);
			container.add(pulse);

			this.tweens.add({
				targets: pulse,
				scaleX: 1.2,
				scaleY: 1.2,
				alpha: 0,
				duration: 2000,
				repeat: -1,
				ease: 'Sine.easeOut',
			});
		}

		// ── Interaction ──
		container.setSize(cardW + 8, cardH + 20);
		container.setInteractive({ useHandCursor: !locked });

		if (!locked) {
			container.on('pointerover', () => {
				this.tweens.add({
					targets: container,
					scaleX: 1.08,
					scaleY: 1.08,
					duration: 150,
					ease: 'Back.easeOut',
				});
				// Brighten card border
				card.clear();
				card.fillStyle(C.panel, 1);
				card.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);
				card.lineStyle(2, C.accent, 1);
				card.strokeRect(-cardW / 2, -cardH / 2, cardW, cardH);
				card.lineStyle(1, theme.border, 0.6);
				card.strokeRect(-cardW / 2 + 3, -cardH / 2 + 3, cardW - 6, cardH - 6);
			});

			container.on('pointerout', () => {
				this.tweens.add({
					targets: container,
					scaleX: 1,
					scaleY: 1,
					duration: 150,
					ease: 'Sine.easeOut',
				});
				card.clear();
				card.fillStyle(C.panel, 0.95);
				card.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);
				card.lineStyle(2, C.border, 0.9);
				card.strokeRect(-cardW / 2, -cardH / 2, cardW, cardH);
				card.lineStyle(1, theme.border, 0.4);
				card.strokeRect(-cardW / 2 + 3, -cardH / 2 + 3, cardW - 6, cardH - 6);
			});

			container.on('pointerdown', () => {
				if (this.isTransitioning) return;
				this.isTransitioning = true;

				this.cameras.main.zoomTo(2.5, 500, 'Sine.easeInOut');
				this.cameras.main.pan(x, y, 500, 'Sine.easeInOut');

				this.time.delayedCall(550, () => {
					this.scene.start('StageDetail', { mapId });
				});
			});
		} else {
			container.on('pointerdown', () => {
				this.tweens.add({
					targets: container,
					x: { from: x - 3, to: x + 3 },
					duration: 50,
					yoyo: true,
					repeat: 3,
					onComplete: () => container.setX(x),
				});
			});
		}
	}

	private getMapIcon(mapId: string): string {
		switch (mapId) {
			case 'forest_gate':
				return '♣';
			case 'lava_fortress':
				return '♦';
			case 'storm_citadel':
				return '♠';
			default:
				return '?';
		}
	}

	private onShutdown() {
		this.isTransitioning = false;
		this.events.off('shutdown', this.onShutdown, this);
	}
}
