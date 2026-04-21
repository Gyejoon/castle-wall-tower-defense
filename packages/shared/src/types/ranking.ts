export type RunResult = 'victory' | 'defeat';

export interface RunRecord {
	id: string;
	userId: string;
	waveReached: number;
	remainingHp: number;
	initialHp: number;
	result: RunResult;
	towersPlaced: number;
	durationSec: number;
	goldEarned: number;
	submittedAt: string;
}

export interface LeaderboardRow {
	userId: string;
	nickname: string;
	avatarKey: string;
	waveReached: number;
	remainingHp: number;
	result: RunResult;
	achievedAt: string;
	rank: number;
}

export interface ProfileRow {
	id: string;
	nickname: string;
	avatarKey: string;
	createdAt: string;
	updatedAt: string;
}

export interface SubmitRunPayload {
	waveReached: number;
	remainingHp: number;
	initialHp: number;
	result: RunResult;
	towersPlaced: number;
	durationSec: number;
	goldEarned: number;
}
