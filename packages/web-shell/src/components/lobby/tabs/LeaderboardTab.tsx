import { useEffect } from 'react';
import { AVATAR_PRESETS } from '../../../data/avatarPresets';
import { useRankingStore } from '../../../stores/rankingStore';

const AVATAR_LABEL_BY_KEY = new Map(
	AVATAR_PRESETS.map((p) => [p.key, p.label]),
);

export function LeaderboardTab() {
	const rows = useRankingStore((s) => s.leaderboard);
	const err = useRankingStore((s) => s.leaderboardError);
	const fetchLeaderboard = useRankingStore((s) => s.fetchLeaderboard);

	useEffect(() => {
		// Always refresh on mount. Submit-side invalidate() already nulls the
		// cached rows, so a stale row never flashes; any other mount path
		// (switching tabs) also gets fresh data with minimal cost.
		fetchLeaderboard();
	}, [fetchLeaderboard]);

	return (
		<div className="flex-1 min-h-0 overflow-y-auto px-3 pb-6">
			<h2
				className="font-pixel text-[15px] text-accent py-4"
				style={{ letterSpacing: '0.16em' }}
			>
				&gt;_ 랭킹
			</h2>
			{err && (
				<div className="font-pixel text-[11px] text-danger py-4">
					에러: {err}
				</div>
			)}
			{!err && rows === null && (
				<div className="font-pixel text-[11px] text-text-secondary py-4">
					로딩…
				</div>
			)}
			{!err && rows?.length === 0 && (
				<div className="font-pixel text-[11px] text-text-secondary py-4">
					아직 기록이 없습니다. 첫 번째 기록의 주인공이 되어보세요.
				</div>
			)}
			{rows && rows.length > 0 && (
				<ul className="flex flex-col gap-2">
					{rows.map((r) => {
						const highlight = r.rank <= 3;
						const isMe = r.isMe;
						const avatarLabel =
							AVATAR_LABEL_BY_KEY.get(r.avatarKey) ?? r.nickname.slice(0, 2);
						return (
							// rank is row_number() over the whole board, so it is unique
							// and stable within a fetch — the natural key now that
							// user_id is no longer published.
							<li
								key={r.rank}
								className={`h-12 flex items-center gap-3 px-3 border ${
									highlight ? 'border-gold' : 'border-border'
								} ${isMe ? 'bg-panel/90' : 'bg-panel'} transition-colors duration-150`}
								style={{
									boxShadow: highlight
										? '0 0 8px rgba(240,208,96,0.28)'
										: undefined,
								}}
							>
								<span
									className={`font-pixel w-10 flex-shrink-0 ${
										highlight
											? 'text-[13px] text-gold'
											: 'text-[11px] text-accent'
									}`}
								>
									#{r.rank}
								</span>
								<span className="w-8 h-8 flex-shrink-0 border border-border bg-bg flex items-center justify-center">
									<span className="font-pixel text-[8px] text-text-secondary text-center leading-none whitespace-normal">
										{avatarLabel}
									</span>
								</span>
								<span className="font-pixel text-[11px] text-text flex-1 truncate">
									{r.nickname}
									{isMe && <span className="ml-1 text-accent">(나)</span>}
								</span>
								<span className="font-pixel text-[10px] text-text-secondary">
									W{r.waveReached}
								</span>
								<span className="font-pixel text-[10px] text-danger">
									HP{r.remainingHp}
								</span>
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
