import type { LeaderboardRow, RunRecord } from '@gld/shared';
import { create } from 'zustand';
import { supabase, supabaseConfigured } from '../lib/supabase';

interface RawLeaderboardRow {
	is_me: boolean;
	nickname: string;
	avatar_key: string;
	wave_reached: number;
	remaining_hp: number;
	result: 'victory' | 'defeat';
	achieved_at: string;
	rank: number;
}

interface RawRun {
	id: string;
	user_id: string;
	wave_reached: number;
	remaining_hp: number;
	initial_hp: number;
	result: 'victory' | 'defeat';
	towers_placed: number;
	duration_sec: number;
	gold_earned: number;
	submitted_at: string;
}

function toRow(d: RawLeaderboardRow): LeaderboardRow {
	return {
		// `??` not `!!`: an older view that predates the is_me column would
		// yield undefined, and silently highlighting nothing beats crashing.
		isMe: d.is_me ?? false,
		nickname: d.nickname,
		avatarKey: d.avatar_key,
		waveReached: d.wave_reached,
		remainingHp: d.remaining_hp,
		result: d.result,
		achievedAt: d.achieved_at,
		rank: d.rank,
	};
}

function toRun(d: RawRun): RunRecord {
	return {
		id: d.id,
		userId: d.user_id,
		waveReached: d.wave_reached,
		remainingHp: d.remaining_hp,
		initialHp: d.initial_hp,
		result: d.result,
		towersPlaced: d.towers_placed,
		durationSec: d.duration_sec,
		goldEarned: d.gold_earned,
		submittedAt: d.submitted_at,
	};
}

interface RankingState {
	leaderboard: LeaderboardRow[] | null;
	leaderboardError: string | null;
	leaderboardLoading: boolean;

	myRuns: RunRecord[] | null;
	myRunsUserId: string | null;
	myRunsError: string | null;
	myRunsLoading: boolean;

	fetchLeaderboard: () => Promise<void>;
	fetchMyRuns: (userId: string) => Promise<void>;
	invalidate: () => void;
}

// Monotonic request IDs to drop stale responses when a rapid re-fetch arrives
// before the previous one resolves.
let leaderboardReqGen = 0;
let myRunsReqGen = 0;

export const useRankingStore = create<RankingState>((set, get) => ({
	leaderboard: null,
	leaderboardError: null,
	leaderboardLoading: false,

	myRuns: null,
	myRunsUserId: null,
	myRunsError: null,
	myRunsLoading: false,

	async fetchLeaderboard() {
		if (!supabaseConfigured) {
			set({
				leaderboard: [],
				leaderboardError: null,
				leaderboardLoading: false,
			});
			return;
		}
		const gen = ++leaderboardReqGen;
		set({ leaderboardLoading: true, leaderboardError: null });
		const { data, error } = await supabase
			.from('v_leaderboard')
			.select('*')
			.order('rank', { ascending: true })
			.limit(100);
		if (gen !== leaderboardReqGen) return; // a newer fetch is in flight
		if (error) {
			set({
				leaderboard: null,
				leaderboardError: error.message,
				leaderboardLoading: false,
			});
			return;
		}
		set({
			leaderboard: ((data ?? []) as RawLeaderboardRow[]).map(toRow),
			leaderboardError: null,
			leaderboardLoading: false,
		});
	},

	async fetchMyRuns(userId) {
		if (!supabaseConfigured) {
			set({
				myRuns: [],
				myRunsUserId: userId,
				myRunsError: null,
				myRunsLoading: false,
			});
			return;
		}
		const gen = ++myRunsReqGen;
		set({ myRunsLoading: true, myRunsError: null, myRunsUserId: userId });
		const { data, error } = await supabase
			.from('runs')
			.select(
				'id, user_id, wave_reached, remaining_hp, initial_hp, result, towers_placed, duration_sec, gold_earned, submitted_at',
			)
			.eq('user_id', userId)
			.order('submitted_at', { ascending: false })
			.limit(50);
		if (gen !== myRunsReqGen) return;
		// If the caller switched identity mid-flight, drop the result — the
		// UI already moved on.
		if (get().myRunsUserId !== userId) return;
		if (error) {
			set({
				myRuns: null,
				myRunsError: error.message,
				myRunsLoading: false,
			});
			return;
		}
		set({
			myRuns: ((data ?? []) as RawRun[]).map(toRun),
			myRunsError: null,
			myRunsLoading: false,
		});
	},

	invalidate() {
		// Called after a successful run submission so the next mount of the
		// leaderboard/profile tab re-fetches. We clear cached rows entirely
		// so a stale row doesn't render while the fetch is in flight.
		set({
			leaderboard: null,
			leaderboardError: null,
			myRuns: null,
			myRunsError: null,
		});
	},
}));
