import { beforeEach, describe, expect, it, vi } from 'vitest';

const { EventBus } = vi.hoisted(() => ({
	EventBus: {
		emit: vi.fn(),
		on: vi.fn(),
		off: vi.fn(),
		removeAllListeners: vi.fn(),
	},
}));

vi.mock('phaser', () => ({
	default: {
		Scene: class {
			constructor(_key?: string) {}
		},
	},
}));

vi.mock('../src/EventBus', () => ({
	EventBus,
}));

import { UIScene } from '../src/scenes/UIScene';

function createScene(): UIScene & Record<string, unknown> {
	return new UIScene() as UIScene & Record<string, unknown>;
}

describe('UIScene', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('creates with correct scene key', () => {
		const scene = createScene();
		expect(scene).toBeDefined();
	});
});
