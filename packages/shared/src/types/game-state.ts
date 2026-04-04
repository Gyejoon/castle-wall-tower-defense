export type WavePhase = 'combat' | 'waiting' | 'boss' | 'ended';

export interface CombatHudState {
	currentSlot: number;
	phase: WavePhase;
	bossWarning: boolean;
	timerLabel: string;
}
