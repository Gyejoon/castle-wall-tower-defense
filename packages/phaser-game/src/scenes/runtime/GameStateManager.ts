import type { WaveDef, WavePhase } from '@gld/shared';
import { INITIAL_PLAYER_HP } from '@gld/shared';
import type { EventBus as EventBusType } from '../../EventBus';

type Emit = typeof EventBusType.emit;

interface GameStateManagerDeps {
	initialHp?: number;
	emit: Emit;
	// 최초 1회만 호출 (endGame이 idempotent).
	onEndGame: (reason: EndGameReason) => void;
	onExitSideEffect?: (remainingHp: number, isBossLeak: boolean) => void;
}

export type EndGameReason =
	| { result: 'victory'; reason: 'all_waves_cleared' }
	| { result: 'defeat'; reason: 'base_hp_depleted' };

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

	tick(deltaMs: number): number {
		const scaled = deltaMs * this.speedMultiplier;
		this.scaledGameTime += scaled;
		return scaled;
	}

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
			// 보스 누수는 HP와 무관하게 즉시 패배. 내부 HP와 성벽 연출 모두 0으로 맞춘다.
			this.hp = 0;
			this.deps.onExitSideEffect?.(0, defeatFromBoss);
			this.endGame({ result: 'defeat', reason: 'base_hp_depleted' });
			return;
		}

		if (anyApplied) {
			this.deps.onExitSideEffect?.(this.hp, false);
		}
	}

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

	// idempotent.
	endGame(reason: EndGameReason): void {
		if (this.gameOverFlag) return;
		this.gameOverFlag = true;
		this.deps.onEndGame(reason);
	}

	destroy(): void {}
}
