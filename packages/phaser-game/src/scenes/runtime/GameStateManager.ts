import type { WaveDef, WavePhase } from '@gld/shared';
import { INITIAL_PLAYER_HP } from '@gld/shared';
import type { EventBus as EventBusType } from '../../EventBus';

type Emit = typeof EventBusType.emit;

interface GameStateManagerDeps {
	initialHp?: number;
	emit: Emit;
	/**
	 * Called when the game transitions from running → terminal (victory or
	 * defeat). GameStateManager owns the `gameOver` flag and fires this once
	 * — Game.ts uses the callback to run its last-mile cleanup (emit
	 * `game-over` with full stats, tear down range overlay, stop wave
	 * system, etc.).
	 */
	onEndGame: (reason: EndGameReason) => void;
	/**
	 * Called per-exit with the remaining HP and whether the exit was a boss
	 * leak (instant defeat). Game.ts uses this for HUD chrome — emitting
	 * `base-hp-changed` and animating the castle wall. GameStateManager
	 * does not reference Phaser GameObjects directly.
	 */
	onExitSideEffect?: (remainingHp: number, isBossLeak: boolean) => void;
}

export type EndGameReason =
	| { result: 'victory'; reason: 'all_waves_cleared' }
	| { result: 'defeat'; reason: 'base_hp_depleted' };

/**
 * Owns the game-run lifecycle that used to live inline on `GameScene`:
 * player HP, game-over flag, gold earned, speed multiplier, scaled scene
 * time, and the current wave slot. Extracted in Phase 6.
 *
 * Kept intentionally Phaser-free — the manager neither knows about scene
 * objects nor subscribes to EventBus directly (it uses the injected
 * `emit`). That keeps it testable with plain mocks.
 */
export class GameStateManager {
	private hp: number;
	private readonly initialHp: number;
	private gameOverFlag = false;
	private goldEarned = 0;
	private speedMultiplier: 1 | 2 | 3 = 1;
	private scaledGameTime = 0;
	private currentWaveSlot = 1;
	private currentSlotDef: WaveDef | undefined;

	constructor(private readonly deps: GameStateManagerDeps) {
		this.initialHp = deps.initialHp ?? INITIAL_PLAYER_HP;
		this.hp = this.initialHp;
	}

	// --- Getters ---
	getHp(): number {
		return this.hp;
	}
	getGameOver(): boolean {
		return this.gameOverFlag;
	}
	isGameOver(): boolean {
		return this.gameOverFlag;
	}
	getGoldEarned(): number {
		return this.goldEarned;
	}
	getSpeedMultiplier(): 1 | 2 | 3 {
		return this.speedMultiplier;
	}
	getScaledTime(): number {
		return this.scaledGameTime;
	}
	getCurrentWaveSlot(): number {
		return this.currentWaveSlot;
	}
	getCurrentSlotDef(): WaveDef | undefined {
		return this.currentSlotDef;
	}
	getInitialHp(): number {
		return this.initialHp;
	}

	// --- Mutators ---
	addGold(amount: number): void {
		this.goldEarned += amount;
	}

	setSpeed(mult: 1 | 2 | 3): void {
		this.speedMultiplier = mult;
	}

	setHp(hp: number): void {
		this.hp = Math.max(0, hp);
	}

	setGameOver(flag: boolean): void {
		this.gameOverFlag = flag;
	}

	setCurrentWaveSlot(slot: number): void {
		this.currentWaveSlot = slot;
	}

	setCurrentSlotDef(def: WaveDef): void {
		this.currentSlotDef = def;
	}

	/**
	 * Advances `scaledGameTime` by `deltaMs * speedMultiplier` and returns
	 * the scaled delta for the rest of `update()` to use.
	 */
	tick(deltaMs: number): number {
		const scaled = deltaMs * this.speedMultiplier;
		this.scaledGameTime += scaled;
		return scaled;
	}

	/**
	 * Port of the pre-Phase-6 exit-handling block in `GameScene.update`. For
	 * each exit, subtracts 1 HP and emits `player-damaged`; a boss leak or
	 * HP hitting zero triggers an instant defeat. Non-terminal exits notify
	 * Game.ts via `onExitSideEffect` so it can update the castle wall +
	 * emit `base-hp-changed`.
	 */
	applyExits(exits: ReadonlyArray<{ id: string; isBoss: boolean }>): void {
		if (exits.length === 0 || this.gameOverFlag) return;

		let anyApplied = false;
		let defeated = false;
		let defeatFromBoss = false;

		for (const exit of exits) {
			this.hp = Math.max(0, this.hp - 1);
			anyApplied = true;
			this.deps.emit('player-damaged', {
				playerId: 'local',
				damage: 1,
				remainingHp: this.hp,
			});

			if (exit.isBoss) {
				defeated = true;
				defeatFromBoss = true;
				break;
			}
			if (this.hp <= 0) {
				defeated = true;
				break;
			}
		}

		if (defeated) {
			// Final side effect with HP=0 so Game.ts flashes the wall empty.
			this.deps.onExitSideEffect?.(0, defeatFromBoss);
			this.endGame({ result: 'defeat', reason: 'base_hp_depleted' });
			return;
		}

		if (anyApplied) {
			this.deps.onExitSideEffect?.(this.hp, false);
		}
	}

	/**
	 * Called by Game.ts once per tick after `applyExits`. If the phase
	 * lifecycle has ended AND no units remain active or queued, triggers
	 * a victory end-game.
	 */
	checkVictoryCondition(
		phase: WavePhase,
		hasActiveUnits: boolean,
		hasQueuedUnits: boolean,
	): void {
		if (this.gameOverFlag) return;
		if (phase !== 'ended') return;
		if (hasActiveUnits || hasQueuedUnits) return;
		this.endGame({ result: 'victory', reason: 'all_waves_cleared' });
	}

	/**
	 * Marks the run terminal and notifies Game.ts via `onEndGame`. Idempotent
	 * — repeat calls after the first are ignored.
	 */
	endGame(reason: EndGameReason): void {
		if (this.gameOverFlag) return;
		this.gameOverFlag = true;
		this.deps.onEndGame(reason);
	}

	destroy(): void {
		// No owned resources; kept for symmetry with other runtime controllers.
	}
}
