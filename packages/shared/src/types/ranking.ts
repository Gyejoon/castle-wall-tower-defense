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
	/** Server-computed "this row belongs to the caller". v_leaderboard no
	 *  longer publishes user_id, so identity comparison happens in Postgres
	 *  instead of handing every client every player's auth UUID. */
	isMe: boolean;
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
