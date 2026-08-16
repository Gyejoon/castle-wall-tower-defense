import { beforeEach, describe, expect, it, vi } from 'vitest';

const fromMock = vi.fn();

vi.mock('../../lib/supabase', () => ({
	supabase: { from: fromMock },
	supabaseConfigured: true,
}));

beforeEach(() => {
	vi.resetModules();
	vi.clearAllMocks();
});

function mockSelectOrderLimit(result: {
	data: unknown[] | null;
	error: { message: string } | null;
}) {
	fromMock.mockReturnValue({
		select: vi.fn().mockReturnValue({
			order: vi.fn().mockReturnValue({
				limit: vi.fn().mockResolvedValue(result),
			}),
		}),
	});
}

function mockSelectEqOrderLimit(result: {
	data: unknown[] | null;
	error: { message: string } | null;
}) {
	fromMock.mockReturnValue({
		select: vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				order: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue(result),
				}),
			}),
		}),
	});
}

describe('rankingStore.fetchLeaderboard', () => {
	it('normalizes rows from snake_case to camelCase', async () => {
		mockSelectOrderLimit({
			data: [
				{
					is_me: true,
					nickname: 'alice',
					avatar_key: 'tower/archer',
					wave_reached: 20,
					remaining_hp: 12,
					result: 'defeat',
					achieved_at: '2026-04-20T00:00:00Z',
					rank: 1,
				},
			],
			error: null,
		});
		const { useRankingStore } = await import('../rankingStore');
		await useRankingStore.getState().fetchLeaderboard();
		const rows = useRankingStore.getState().leaderboard;
		expect(rows).toHaveLength(1);
		expect(rows?.[0]).toMatchObject({
			// user_id is no longer published by v_leaderboard — the server sends
			// a precomputed is_me instead.
			isMe: true,
			avatarKey: 'tower/archer',
			waveReached: 20,
			remainingHp: 12,
			achievedAt: '2026-04-20T00:00:00Z',
		});
		expect(useRankingStore.getState().leaderboardError).toBeNull();
	});

	it('captures fetch errors in leaderboardError', async () => {
		mockSelectOrderLimit({ data: null, error: { message: 'boom' } });
		const { useRankingStore } = await import('../rankingStore');
		await useRankingStore.getState().fetchLeaderboard();
		expect(useRankingStore.getState().leaderboard).toBeNull();
		expect(useRankingStore.getState().leaderboardError).toBe('boom');
	});
});

describe('rankingStore.fetchMyRuns', () => {
	it('tags result with myRunsUserId and normalizes rows', async () => {
		mockSelectEqOrderLimit({
			data: [
				{
					id: 'r1',
					user_id: 'u1',
					wave_reached: 10,
					remaining_hp: 5,
					initial_hp: 20,
					result: 'defeat',
					towers_placed: 3,
					duration_sec: 100,
					gold_earned: 50,
					submitted_at: '2026-04-20T00:00:00Z',
				},
			],
			error: null,
		});
		const { useRankingStore } = await import('../rankingStore');
		await useRankingStore.getState().fetchMyRuns('u1');
		const runs = useRankingStore.getState().myRuns;
		expect(runs).toHaveLength(1);
		expect(runs?.[0]).toMatchObject({
			id: 'r1',
			userId: 'u1',
			waveReached: 10,
			remainingHp: 5,
			initialHp: 20,
		});
		expect(useRankingStore.getState().myRunsUserId).toBe('u1');
	});
});

describe('rankingStore.invalidate', () => {
	it('clears cached leaderboard and myRuns rows', async () => {
		mockSelectOrderLimit({
			data: [
				{
					is_me: true,
					nickname: 'alice',
					avatar_key: 'tower/archer',
					wave_reached: 20,
					remaining_hp: 12,
					result: 'defeat',
					achieved_at: '2026-04-20T00:00:00Z',
					rank: 1,
				},
			],
			error: null,
		});
		const { useRankingStore } = await import('../rankingStore');
		await useRankingStore.getState().fetchLeaderboard();
		expect(useRankingStore.getState().leaderboard).not.toBeNull();
		useRankingStore.getState().invalidate();
		expect(useRankingStore.getState().leaderboard).toBeNull();
		expect(useRankingStore.getState().myRuns).toBeNull();
	});
});
