import { beforeEach, describe, expect, it, vi } from 'vitest';

const { soundGenerator, EventBus } = vi.hoisted(() => ({
	soundGenerator: {
		unlock: vi.fn(),
		playWaveStart: vi.fn(),
		playGoldEarned: vi.fn(),
		playGoldSpent: vi.fn(),
		playPressureAttackSend: vi.fn(),
	},
	EventBus: {
		emit: vi.fn(),
		on: vi.fn(),
		off: vi.fn(),
	},
}));

vi.mock('phaser', () => ({
	default: {
		Scene: class {
			constructor(_key?: string) {}
		},
	},
}));

vi.mock('../src/audio/SoundGenerator', () => ({
	soundGenerator,
}));

vi.mock('../src/EventBus', () => ({
	EventBus,
}));

import { GameScene } from '../src/scenes/Game';

type TestScene = {
	gold: number;
	ghostBattleActive: boolean;
	pressureSystem: {
		getChoice: ReturnType<typeof vi.fn>;
		applyPlayerPressure: ReturnType<typeof vi.fn>;
		applyGhostPressure: ReturnType<typeof vi.fn>;
	};
	ghostPlayer: {
		getWavePressure: ReturnType<typeof vi.fn>;
	};
	ghostRecorder: {
		startWave: ReturnType<typeof vi.fn>;
	};
	spendGold: ReturnType<typeof vi.fn>;
	earnGold: ReturnType<typeof vi.fn>;
	unlockAudio: () => void;
	handleWaveStartedLifecycle: (data: {
		wave: number;
		totalWaves: number;
	}) => void;
};

function createScene(): TestScene {
	return new GameScene() as unknown as TestScene;
}

describe('GameScene sound semantics', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('plays gold-earned sound only for bounty income', () => {
		const scene = createScene();
		scene.gold = 100;

		scene.earnGold(25, 'bounty');

		expect(scene.gold).toBe(125);
		expect(soundGenerator.playGoldEarned).toHaveBeenCalledOnce();
		expect(EventBus.emit).toHaveBeenCalledWith('gold-changed', { gold: 125 });
	});

	it('does not play gold-earned sound for refunds', () => {
		const scene = createScene();
		scene.gold = 100;

		scene.earnGold(25, 'refund');

		expect(scene.gold).toBe(125);
		expect(soundGenerator.playGoldEarned).not.toHaveBeenCalled();
	});

	it('resumes audio on user interaction', () => {
		const scene = createScene();

		scene.unlockAudio();

		expect(soundGenerator.unlock).toHaveBeenCalledOnce();
	});

	it('plays attack-send sound only when player attack pressure is applied', () => {
		const scene = createScene();
		scene.ghostBattleActive = true;
		scene.gold = 100;
		scene.pressureSystem = {
			getChoice: vi.fn(() => 'attack'),
			applyPlayerPressure: vi.fn(() => -50),
			applyGhostPressure: vi.fn(),
		};
		scene.ghostPlayer = {
			getWavePressure: vi.fn(() => 'attack'),
		};
		scene.ghostRecorder = {
			startWave: vi.fn(),
		};
		scene.spendGold = vi.fn();
		scene.earnGold = vi.fn();

		scene.handleWaveStartedLifecycle({ wave: 1, totalWaves: 5 });

		expect(soundGenerator.playPressureAttackSend).toHaveBeenCalledOnce();
	});

	it('does not play attack-send sound for ghost attack pressure alone', () => {
		const scene = createScene();
		scene.ghostBattleActive = true;
		scene.gold = 100;
		scene.pressureSystem = {
			getChoice: vi.fn(() => 'defend'),
			applyPlayerPressure: vi.fn(() => 20),
			applyGhostPressure: vi.fn(),
		};
		scene.ghostPlayer = {
			getWavePressure: vi.fn(() => 'attack'),
		};
		scene.ghostRecorder = {
			startWave: vi.fn(),
		};
		scene.spendGold = vi.fn();
		scene.earnGold = vi.fn();

		scene.handleWaveStartedLifecycle({ wave: 1, totalWaves: 5 });

		expect(soundGenerator.playPressureAttackSend).not.toHaveBeenCalled();
	});

	it('does not play attack-send sound when attack pressure falls back to defend', () => {
		const scene = createScene();
		let choice: 'attack' | 'defend' = 'attack';
		scene.ghostBattleActive = true;
		scene.gold = 10;
		scene.pressureSystem = {
			getChoice: vi.fn(() => choice),
			applyPlayerPressure: vi.fn(() => {
				choice = 'defend';
				return 20;
			}),
			applyGhostPressure: vi.fn(),
		};
		scene.ghostPlayer = {
			getWavePressure: vi.fn(() => 'defend'),
		};
		scene.ghostRecorder = {
			startWave: vi.fn(),
		};
		scene.spendGold = vi.fn();
		scene.earnGold = vi.fn();

		scene.handleWaveStartedLifecycle({ wave: 1, totalWaves: 5 });

		expect(soundGenerator.playPressureAttackSend).not.toHaveBeenCalled();
	});
});
