import {
	ALL_TOWERS,
	getMapPaths,
	getMaxGoldForMap,
	getMaxXpForMap,
	getTotalWavesForMap,
	getWavesForMap,
	MAP_REGISTRY,
} from '@gld/shared';
import Phaser from 'phaser';
import { MAP_THEMES } from '../constants/mapThemes';
import { EventBus } from '../EventBus';

export class StageDetailScene extends Phaser.Scene {
	private isTransitioning = false;

	constructor() {
		super('StageDetail');
	}

	create(data: { mapId: string }) {
		this.isTransitioning = false;
		this.events.on('shutdown', this.onShutdown, this);

		const { mapId } = data;
		const map = MAP_REGISTRY[mapId];
		if (!map) {
			this.scene.start('WorldMap');
			return;
		}

		const { width, height } = this.scale;
		const theme = MAP_THEMES[mapId] ?? { start: 0x2a2010, emoji: '❓' };

		this.cameras.main.fadeIn(300);

		let yOffset = 0;

		// ===== Hero area =====
		const heroH = 120;
		const heroBg = this.add.graphics();
		heroBg.fillStyle(theme.start, 1);
		heroBg.fillRect(0, 0, width, heroH);
		// Gradient overlay
		const overlay = this.add.graphics();
		overlay.fillGradientStyle(
			0x1a1208,
			0x1a1208,
			0x1a1208,
			0x1a1208,
			0,
			0,
			0.9,
			0.9,
		);
		overlay.fillRect(0, heroH * 0.5, width, heroH * 0.5);

		// Icon
		this.add
			.text(width / 2, heroH * 0.4, theme.emoji, { fontSize: '48px' })
			.setOrigin(0.5);

		// Map name (title 15px)
		this.add
			.text(16, heroH - 20, map.name, {
				fontFamily: '"Press Start 2P"',
				fontSize: '15px',
				color: '#f0e8d8',
			})
			.setOrigin(0, 1);

		// Recommended level (label 10px)
		const lvl = map.unlockLevel ?? 1;
		this.add
			.text(width - 16, heroH - 18, `권장 Lv.${lvl}`, {
				fontFamily: '"Press Start 2P"',
				fontSize: '10px',
				color: '#c8a04a',
				backgroundColor: 'rgba(26,18,8,0.8)',
				padding: { x: 6, y: 3 },
			})
			.setOrigin(1, 1);

		yOffset = heroH + 12;

		// ===== Info cards 2x2 =====
		const cardW = (width - 48) / 2;
		const cardH = 52;
		const maxXp = getMaxXpForMap(mapId);
		const maxGold = getMaxGoldForMap(mapId);
		const totalWaves = getTotalWavesForMap(mapId);
		const waves = getWavesForMap(mapId);
		const hasBoss = waves.some((w) => w.kind === 'boss');
		const lanes = getMapPaths(map).length;

		const infoData = [
			{
				label: '최대 경험치',
				value: `${maxXp} XP`,
				sub: `${totalWaves}웨이브 클리어 시`,
			},
			{ label: '최대 골드', value: `~${maxGold} G`, sub: '전 몬스터 처치 시' },
			{
				label: '웨이브',
				value: `${totalWaves}`,
				sub: hasBoss ? '보스 포함' : '보스 없음',
			},
			{
				label: '경로',
				value: `${lanes} 레인`,
				sub: lanes === 1 ? '단일 경로' : '분기 경로',
			},
		];

		for (let i = 0; i < 4; i++) {
			const col = i % 2;
			const row = Math.floor(i / 2);
			const cx = 16 + col * (cardW + 16);
			const cy = yOffset + row * (cardH + 8);
			this.drawInfoCard(cx, cy, cardW, cardH, infoData[i]);
		}

		yOffset += (cardH + 8) * 2 + 8;

		// ===== Clear record =====
		const highestWave =
			(this.game.registry.get('highestWave') as Record<string, number>) ?? {};
		const best = highestWave[mapId] ?? 0;

		this.add.text(16, yOffset, '클리어 기록', {
			fontFamily: '"Press Start 2P"',
			fontSize: '8px',
			color: '#a09070',
		});
		yOffset += 16;

		// Progress bar
		const barX = 16;
		const barW = width - 32;
		const barH = 10;
		const barBg = this.add.graphics();
		barBg.fillStyle(0x2a2010, 1);
		barBg.fillRect(barX, yOffset, barW, barH);
		barBg.lineStyle(1, 0x4a3a20, 1);
		barBg.strokeRect(barX, yOffset, barW, barH);

		if (best > 0) {
			const fillW = Math.max(1, (best / totalWaves) * barW);
			const fill = this.add.graphics();
			fill.fillGradientStyle(
				0xc8a04a,
				0xf0d060,
				0xc8a04a,
				0xf0d060,
				1,
				1,
				1,
				1,
			);
			fill.fillRect(barX, yOffset, fillW, barH);
		}

		this.add
			.text(width - 16, yOffset + barH / 2, `${best}/${totalWaves}`, {
				fontFamily: '"Press Start 2P"',
				fontSize: '8px',
				color: '#f0e8d8',
			})
			.setOrigin(1, 0.5);

		yOffset += barH + 16;

		// ===== Deck preview =====
		this.add.text(16, yOffset, '출전 덱', {
			fontFamily: '"Press Start 2P"',
			fontSize: '8px',
			color: '#a09070',
		});

		// Edit button
		const editBtn = this.add
			.text(width - 16, yOffset, '편집 ▸', {
				fontFamily: '"Press Start 2P"',
				fontSize: '8px',
				color: '#c8a04a',
				backgroundColor: '#2a2010',
				padding: { x: 6, y: 3 },
			})
			.setOrigin(1, 0)
			.setInteractive({ useHandCursor: true })
			.on('pointerdown', () => {
				EventBus.emit('request-deck-edit');
			});
		editBtn.on('pointerover', () => editBtn.setColor('#f0d060'));
		editBtn.on('pointerout', () => editBtn.setColor('#c8a04a'));

		yOffset += 20;

		const deckIds = (this.game.registry.get('deckIds') as string[]) ?? [];
		const slotW = (width - 48) / 4;
		const slotH = 60;

		for (let i = 0; i < 4; i++) {
			const sx = 16 + i * (slotW + 8);
			const tower = ALL_TOWERS.find((t) => t.id === deckIds[i]);

			const slot = this.add.graphics();
			slot.fillStyle(0x2a2010, 1);
			slot.fillRect(sx, yOffset, slotW, slotH);
			slot.lineStyle(1, 0x4a3a20, 1);
			slot.strokeRect(sx, yOffset, slotW, slotH);

			if (tower) {
				// Tower icon placeholder (emoji based on type)
				this.add
					.text(sx + slotW / 2, yOffset + 18, '🏗', { fontSize: '20px' })
					.setOrigin(0.5);

				this.add
					.text(sx + slotW / 2, yOffset + 38, tower.name, {
						fontFamily: '"Press Start 2P"',
						fontSize: '6px',
						color: '#a09070',
						wordWrap: { width: slotW - 4 },
						align: 'center',
					})
					.setOrigin(0.5, 0);

				this.add
					.text(sx + slotW / 2, yOffset + slotH - 4, `⚡${tower.cost}`, {
						fontFamily: '"Press Start 2P"',
						fontSize: '7px',
						color: '#c8a04a',
					})
					.setOrigin(0.5, 1);
			}
		}

		yOffset += slotH + 16;

		// ===== Game start button =====
		const btnH = 44;
		const btnY = Math.max(yOffset, height - btnH - 16);
		const btn = this.add.graphics();
		btn.fillGradientStyle(0xc8a04a, 0xc8a04a, 0xa07830, 0xa07830, 1, 1, 1, 1);
		btn.fillRect(16, btnY, width - 32, btnH);
		btn.lineStyle(2, 0xf0d060, 1);
		btn.strokeRect(16, btnY, width - 32, btnH);

		this.add
			.text(width / 2, btnY + btnH / 2, '⚔️ 게임 시작', {
				fontFamily: '"Press Start 2P"',
				fontSize: '13px',
				color: '#1a1208',
			})
			.setOrigin(0.5);

		// Make button interactive
		const btnZone = this.add
			.zone(width / 2, btnY + btnH / 2, width - 32, btnH)
			.setInteractive({ useHandCursor: true });

		btnZone.on('pointerdown', () => {
			if (this.isTransitioning) return;
			this.isTransitioning = true;
			this.cameras.main.fadeOut(600);
			this.cameras.main.once('camerafadeoutcomplete', () => {
				this.game.registry.set('mapId', mapId);
				EventBus.emit('request-start-game-from-stage', { mapId });
				this.scene.start('Game');
			});
		});

		btnZone.on('pointerover', () => {
			btn.clear();
			btn.fillGradientStyle(0xf0d060, 0xf0d060, 0xc8a04a, 0xc8a04a, 1, 1, 1, 1);
			btn.fillRect(16, btnY, width - 32, btnH);
			btn.lineStyle(2, 0xf0d060, 1);
			btn.strokeRect(16, btnY, width - 32, btnH);
		});

		btnZone.on('pointerout', () => {
			btn.clear();
			btn.fillGradientStyle(0xc8a04a, 0xc8a04a, 0xa07830, 0xa07830, 1, 1, 1, 1);
			btn.fillRect(16, btnY, width - 32, btnH);
			btn.lineStyle(2, 0xf0d060, 1);
			btn.strokeRect(16, btnY, width - 32, btnH);
		});

		// ===== Back button =====
		const backBtn = this.add
			.text(16, btnY - 20, '← 월드맵', {
				fontFamily: '"Press Start 2P"',
				fontSize: '8px',
				color: '#c8a04a',
			})
			.setOrigin(0, 1)
			.setInteractive({ useHandCursor: true })
			.on('pointerdown', () => {
				if (this.isTransitioning) return;
				this.isTransitioning = true;
				this.cameras.main.fadeOut(400);
				this.cameras.main.once('camerafadeoutcomplete', () => {
					this.scene.start('WorldMap');
				});
			});
		backBtn.on('pointerover', () => backBtn.setColor('#f0d060'));
		backBtn.on('pointerout', () => backBtn.setColor('#c8a04a'));
	}

	private drawInfoCard(
		x: number,
		y: number,
		w: number,
		h: number,
		data: { label: string; value: string; sub: string },
	) {
		const card = this.add.graphics();
		card.fillStyle(0x2a2010, 1);
		card.fillRect(x, y, w, h);
		card.lineStyle(1, 0x4a3a20, 1);
		card.strokeRect(x, y, w, h);

		// Label (caption 8px)
		this.add
			.text(x + w / 2, y + 6, data.label, {
				fontFamily: '"Press Start 2P"',
				fontSize: '7px',
				color: '#a09070',
			})
			.setOrigin(0.5, 0);

		// Value (body 11px)
		this.add
			.text(x + w / 2, y + 22, data.value, {
				fontFamily: '"Press Start 2P"',
				fontSize: '11px',
				color: '#f0d060',
			})
			.setOrigin(0.5, 0);

		// Sub text
		this.add
			.text(x + w / 2, y + 38, data.sub, {
				fontFamily: '"Press Start 2P"',
				fontSize: '6px',
				color: '#a09070',
			})
			.setOrigin(0.5, 0);
	}

	private onShutdown() {
		this.isTransitioning = false;
		this.cameras.main.off('camerafadeoutcomplete');
		this.events.off('shutdown', this.onShutdown, this);
	}
}
