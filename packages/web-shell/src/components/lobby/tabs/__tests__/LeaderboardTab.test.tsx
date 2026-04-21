import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
	state: {
		leaderboard: null as unknown[] | null,
		leaderboardError: null as string | null,
		fetchLeaderboard: vi.fn(),
		authUserId: null as string | null,
	},
}));

vi.mock('../../../../stores/rankingStore', () => {
	const useRankingStore = <T,>(sel: (s: typeof hoisted.state) => T) =>
		sel(hoisted.state);
	return { useRankingStore };
});

vi.mock('../../../../stores/authStore', () => {
	const useAuthStore = <T,>(sel: (s: { userId: string | null }) => T) =>
		sel({ userId: hoisted.state.authUserId });
	return { useAuthStore };
});

import { LeaderboardTab } from '../LeaderboardTab';

beforeEach(() => {
	hoisted.state.leaderboard = null;
	hoisted.state.leaderboardError = null;
	hoisted.state.authUserId = null;
	hoisted.state.fetchLeaderboard = vi.fn();
});

describe('LeaderboardTab', () => {
	it('calls fetchLeaderboard on mount', () => {
		render(<LeaderboardTab />);
		expect(hoisted.state.fetchLeaderboard).toHaveBeenCalledTimes(1);
	});

	it('shows loading state while rows are null and no error', () => {
		render(<LeaderboardTab />);
		expect(screen.getByText(/로딩/)).toBeInTheDocument();
	});

	it('shows empty state when rows are []', () => {
		hoisted.state.leaderboard = [];
		render(<LeaderboardTab />);
		expect(screen.getByText(/아직 기록이 없습니다/)).toBeInTheDocument();
	});

	it('renders populated rows', () => {
		hoisted.state.leaderboard = [
			{
				userId: 'u1',
				nickname: 'alice',
				avatarKey: 'tower/archer',
				waveReached: 42,
				remainingHp: 15,
				result: 'defeat',
				achievedAt: '2026-04-20T00:00:00Z',
				rank: 1,
			},
		];
		render(<LeaderboardTab />);
		expect(screen.getByText('alice')).toBeInTheDocument();
		expect(screen.getByText(/W42/)).toBeInTheDocument();
		expect(screen.getByText(/HP15/)).toBeInTheDocument();
	});

	it('marks current user row with (나)', () => {
		hoisted.state.authUserId = 'u1';
		hoisted.state.leaderboard = [
			{
				userId: 'u1',
				nickname: 'alice',
				avatarKey: 'tower/archer',
				waveReached: 10,
				remainingHp: 5,
				result: 'defeat',
				achievedAt: '2026-04-20T00:00:00Z',
				rank: 1,
			},
		];
		render(<LeaderboardTab />);
		expect(screen.getByText(/\(나\)/)).toBeInTheDocument();
	});

	it('shows error state', async () => {
		hoisted.state.leaderboardError = 'network down';
		render(<LeaderboardTab />);
		await waitFor(() =>
			expect(screen.getByText(/network down/)).toBeInTheDocument(),
		);
	});
});
