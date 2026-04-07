import { GAME_CANVAS_H, ORTHO_CANVAS_W } from '@gld/shared';
import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({
	Events: {
		EventEmitter: class {
			on() {
				return this;
			}
			off() {
				return this;
			}
			emit() {
				return true;
			}
			removeAllListeners() {
				return this;
			}
		},
	},
	default: {
		AUTO: 'AUTO',
		Scene: class {
			constructor(_key?: string) {}
		},
		Scale: {
			FIT: 'FIT',
			CENTER_HORIZONTALLY: 'CENTER_HORIZONTALLY',
		},
	},
}));

describe('gameConfig', () => {
	it('uses portrait canvas dimensions and no custom global plugins', async () => {
		const { gameConfig } = await import('../src/config');

		expect(gameConfig.width).toBe(ORTHO_CANVAS_W);
		expect(gameConfig.height).toBe(GAME_CANVAS_H);
		expect(gameConfig.plugins?.global).toBeUndefined();
	});

	it('includes UIScene in scene array', async () => {
		const { gameConfig } = await import('../src/config');
		const sceneNames = (gameConfig.scene as Array<{ name: string }>).map(
			(s) => s.name,
		);
		expect(sceneNames).toContain('UIScene');
	});
});
