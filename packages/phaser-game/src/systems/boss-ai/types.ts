import type { ActiveUnit } from '@gld/shared';

export interface BossContext {
	boss: ActiveUnit;
	sceneTimeMs: number;
	spawnUnit: (
		unitId: string,
		position: { x: number; y: number },
		metadata?: Record<string, unknown>,
	) => void;
	disableTower: (towerId: string, untilMs: number) => void;
}

export interface BossBehavior {
	readonly id: string;
	onSpawn(ctx: BossContext): void;
	onTick(ctx: BossContext, deltaMs: number): void;
	onDamageTaken(ctx: BossContext, hpRatio: number): void;
	isCcImmune(): boolean;
	destroy(): void;
}

export type BossBehaviorFactory = () => BossBehavior;
