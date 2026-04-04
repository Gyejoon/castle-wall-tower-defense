export type WavePhase = 'combat' | 'waiting' | 'boss' | 'ended';

export interface CombatHudState {
	currentSlot: number;
	phase: WavePhase;
	buyCooldownMs: number;
	bossWarning: boolean;
	timerLabel: string;
}
