import { PHASER_COLORS } from '@gld/shared';
import type Phaser from 'phaser';

const POOL_SIZE = 24;
const FLOAT_DURATION = 800; // ms
const FLOAT_DISTANCE = 28; // px upward
const FONT_SIZE = '14px';
const FONT_FAMILY = "'Galmuri11', 'Press Start 2P', cursive";
const DEPTH = 100; // above units, above grid overlays, below modal UI

function toHexStr(n: number): string {
	return `#${n.toString(16).padStart(6, '0')}`;
}

interface FloatingNumber {
	text: Phaser.GameObjects.Text;
	elapsed: number;
	startX: number;
	startY: number;
	active: boolean;
}

export class DamageNumberSystem {
	private pool: FloatingNumber[] = [];
	private enabled = true;

	constructor(scene: Phaser.Scene) {
		for (let i = 0; i < POOL_SIZE; i++) {
			const text = scene.add
				.text(0, 0, '', {
					fontFamily: FONT_FAMILY,
					fontSize: FONT_SIZE,
					color: toHexStr(PHASER_COLORS.text),
					stroke: '#000000',
					strokeThickness: 2,
				})
				.setDepth(DEPTH)
				.setVisible(false)
				.setOrigin(0.5, 1);

			this.pool.push({
				text,
				elapsed: 0,
				startX: 0,
				startY: 0,
				active: false,
			});
		}
	}

	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
		if (!enabled) {
			for (const entry of this.pool) {
				entry.active = false;
				entry.text.setVisible(false);
			}
		}
	}

	show(x: number, y: number, damage: number, isCritical = false): void {
		if (!this.enabled || damage <= 0) return;

		const entry = this.pool.find((e) => !e.active);
		if (!entry) return; // all slots in use, skip

		const hexColor = isCritical ? PHASER_COLORS.gold : PHASER_COLORS.text;
		entry.text.setColor(toHexStr(hexColor));
		entry.text.setText(String(Math.floor(damage)));
		entry.text.setPosition(x, y - 16); // offset above unit center
		entry.text.setVisible(true);
		entry.text.setAlpha(1);
		entry.text.setScale(isCritical ? 1.3 : 1);
		entry.startX = x;
		entry.startY = y - 16;
		entry.elapsed = 0;
		entry.active = true;
	}

	/** Render "MISS" text at (x, y). Used when armor fully absorbs damage. */
	showMiss(x: number, y: number): void {
		if (!this.enabled) return;

		const entry = this.pool.find((e) => !e.active);
		if (!entry) return;

		entry.text.setColor(toHexStr(PHASER_COLORS.textSecondary));
		entry.text.setText('MISS');
		entry.text.setPosition(x, y - 16);
		entry.text.setVisible(true);
		entry.text.setAlpha(1);
		entry.text.setScale(1);
		entry.startX = x;
		entry.startY = y - 16;
		entry.elapsed = 0;
		entry.active = true;
	}

	update(_time: number, delta: number): void {
		if (!this.enabled) return;

		for (const entry of this.pool) {
			if (!entry.active) continue;

			entry.elapsed += delta;
			const progress = Math.min(1, entry.elapsed / FLOAT_DURATION);

			// ease-out-quad for smooth deceleration
			const eased = 1 - (1 - progress) * (1 - progress);

			entry.text.setY(entry.startY - FLOAT_DISTANCE * eased);
			entry.text.setAlpha(1 - eased);

			if (progress >= 1) {
				entry.active = false;
				entry.text.setVisible(false);
			}
		}
	}

	destroy(): void {
		for (const entry of this.pool) {
			entry.text.destroy();
		}
		this.pool.length = 0;
	}
}
