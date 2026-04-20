import type { RunRecord } from '@gld/shared';
import { useEffect } from 'react';
import { AVATAR_PRESETS } from '../data/avatarPresets';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import { useRankingStore } from '../stores/rankingStore';

const AVATAR_LABEL_BY_KEY = new Map(
	AVATAR_PRESETS.map((p) => [p.key, p.label]),
);

export function ProfilePage() {
	const profile = useAuthStore((s) => s.profile);
	const userId = useAuthStore((s) => s.userId);
	const signOut = useAuthStore((s) => s.signOut);

	const runs = useRankingStore((s) => s.myRuns);
	const runsUserId = useRankingStore((s) => s.myRunsUserId);
	const err = useRankingStore((s) => s.myRunsError);
	const fetchMyRuns = useRankingStore((s) => s.fetchMyRuns);

	useEffect(() => {
		if (!userId) return;
		// Refetch when identity changes or when cache was invalidated after
		// a submit. The rankingStore owns request-gen + user-match guards so
		// stale-user results can't land in the UI.
		if (runsUserId !== userId) {
			fetchMyRuns(userId);
		} else if (runs === null) {
			fetchMyRuns(userId);
		}
	}, [userId, runsUserId, runs, fetchMyRuns]);

	const close = () => useGameStore.getState().openProfilePage(false);

	const avatarLabel = profile
		? (AVATAR_LABEL_BY_KEY.get(profile.avatarKey) ??
			profile.nickname.slice(0, 2))
		: '';

	const best = runs?.reduce<RunRecord | null>((acc, r) => {
		if (!acc) return r;
		if (r.waveReached > acc.waveReached) return r;
		if (r.waveReached === acc.waveReached && r.remainingHp > acc.remainingHp)
			return r;
		return acc;
	}, null);

	return (
		<div className="absolute inset-0 bg-bg z-40 flex flex-col">
			<div className="flex items-center justify-between px-4 py-3 border-b border-border">
				<h1
					className="font-pixel text-[15px] text-accent"
					style={{ letterSpacing: '0.16em' }}
				>
					&gt;_ 프로필
				</h1>
				<button
					type="button"
					onClick={close}
					aria-label="닫기"
					className="min-h-[44px] min-w-[44px] font-pixel text-[13px] text-text-secondary"
				>
					X
				</button>
			</div>

			<div className="px-4 py-4 flex items-center gap-4 border-b border-border">
				<span className="w-14 h-14 shrink-0 border border-border bg-panel flex items-center justify-center">
					<span className="font-pixel text-[10px] text-text-secondary text-center leading-none whitespace-normal px-0.5">
						{avatarLabel}
					</span>
				</span>
				<div className="flex flex-col gap-1 min-w-0 flex-1">
					<span className="font-pixel text-[13px] text-text truncate">
						{profile?.nickname ?? '—'}
					</span>
					<span className="font-pixel text-[10px] text-text-secondary">
						가입일{' '}
						{profile?.createdAt
							? new Date(profile.createdAt).toLocaleDateString('ko-KR')
							: '—'}
					</span>
					{best && (
						<span className="font-pixel text-[10px] text-accent">
							베스트 Wave {best.waveReached} · HP {best.remainingHp}
						</span>
					)}
				</div>
			</div>

			<div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
				<h2 className="font-pixel text-[13px] text-accent pb-2">최근 50판</h2>
				{err && (
					<div className="font-pixel text-[11px] text-danger">에러: {err}</div>
				)}
				{!err && runs === null && (
					<div className="font-pixel text-[11px] text-text-secondary">
						로딩…
					</div>
				)}
				{!err && runs?.length === 0 && (
					<div className="font-pixel text-[11px] text-text-secondary">
						아직 기록이 없습니다
					</div>
				)}
				{runs && runs.length > 0 && (
					<ul className="flex flex-col gap-1">
						{runs.map((r) => (
							<li
								key={r.id}
								className="h-10 px-3 flex items-center gap-3 bg-panel border border-border"
							>
								<span
									className={`font-pixel text-[11px] w-8 ${
										r.result === 'victory' ? 'text-success' : 'text-danger'
									}`}
								>
									{r.result === 'victory' ? '승' : '패'}
								</span>
								<span className="font-pixel text-[11px] text-text">
									Wave {r.waveReached}
								</span>
								<span className="font-pixel text-[10px] text-text-secondary">
									HP {r.remainingHp}
								</span>
								<span className="font-pixel text-[8px] text-text-secondary ml-auto">
									{new Date(r.submittedAt).toLocaleDateString('ko-KR')}
								</span>
							</li>
						))}
					</ul>
				)}
			</div>

			<div className="px-4 py-3 border-t border-border">
				<button
					type="button"
					onClick={async () => {
						await signOut();
						close();
					}}
					className="w-full min-h-[44px] border border-border bg-panel font-pixel text-[11px] text-text-secondary"
				>
					로그아웃
				</button>
			</div>
		</div>
	);
}
