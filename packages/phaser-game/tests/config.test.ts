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

vi.mock('phaser3-rex-plugins/plugins/drag.js', () => ({
	default: class Drag {
		destroy() {}
	},
}));

describe('gameConfig', () => {
	it('does not register custom global plugins', async () => {
		const { gameConfig } = await import('../src/config');

		expect(gameConfig.plugins?.global).toBeUndefined();
	});
});
