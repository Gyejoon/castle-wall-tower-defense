import { ACHIEVEMENTS, type AchievementDef } from '@gld/shared';
import { useState } from 'react';
import { useMetaStore } from '../stores/metaStore';

const CATEGORIES = [
	{ id: 'combat_power', label: '전투' },
	{ id: 'level', label: '레벨' },
	{ id: 'tower', label: '타워' },
	{ id: 'progress', label: '진행' },
] as const;

export function AchievementPage() {
	const [category, setCategory] = useState<string>('combat_power');
	const achievements = useMetaStore((s) => s.progress.achievements);
	const claimAchievement = useMetaStore((s) => s.claimAchievement);

	const filtered = ACHIEVEMENTS.filter((a) => a.category === category);
	const totalAchieved = ACHIEVEMENTS.filter(
		(a) => (achievements.progress[a.id] ?? 0) >= a.target,
	).length;

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Header */}
			<div className="px-3 pt-3 pb-2">
				<div className="flex items-center justify-between">
					<span className="font-pixel text-[13px] text-text">업적</span>
					<span className="font-pixel text-[10px] text-text-secondary">
						{totalAchieved}/{ACHIEVEMENTS.length}
					</span>
				</div>
			</div>

			{/* Category tabs */}
			<div className="flex border-b border-border">
				{CATEGORIES.map((cat) => (
					<button
						key={cat.id}
						type="button"
						onClick={() => setCategory(cat.id)}
						className="flex-1 py-2.5 font-pixel text-[10px] text-center cursor-pointer transition-colors"
						style={{
							color: category === cat.id ? '#c8a04a' : '#a09070',
							borderBottom: category === cat.id ? '2px solid #c8a04a' : '2px solid transparent',
						}}
					>
						{cat.label}
					</button>
				))}
			</div>

			{/* Achievement list */}
			<div className="flex-1 overflow-auto p-3 flex flex-col gap-2">
				{filtered.map((ach) => {
					const progress = achievements.progress[ach.id] ?? 0;
					const achieved = progress >= ach.target;
					const claimed = achievements.claimed.includes(ach.id);

					return (
						<div
							key={ach.id}
							className="p-2.5 border"
							style={{
								background: achieved
									? claimed
										? 'rgba(122,182,72,0.08)'
										: 'rgba(200,160,74,0.1)'
									: '#2a2010',
								borderColor: achieved && !claimed ? '#c8a04a' : '#4a3a20',
								opacity: !achieved && progress === 0 ? 0.4 : 1,
							}}
						>
							<div className="flex items-start justify-between gap-2">
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-1.5">
										<span className="font-pixel text-[10px]" style={{ color: achieved ? '#7ab648' : '#a09070' }}>
											{achieved ? '✅' : progress > 0 ? '⬜' : '🔒'}
										</span>
										<span className="font-pixel text-[10px] text-text">
											{progress > 0 || achieved ? ach.name : '???'}
										</span>
									</div>
									<p className="font-pixel text-[8px] text-text-secondary mt-0.5">
										{progress > 0 || achieved ? ach.description : '조건 미공개'}
									</p>
								</div>

								{/* Reward + claim */}
								<div className="flex flex-col items-end gap-1 shrink-0">
									<span className="font-pixel text-[9px] text-gold">
										{progress > 0 || achieved ? `💎 ${ach.reward.diamond}` : '???'}
									</span>
									{achieved && !claimed && (
										<button
											type="button"
											onClick={() => claimAchievement(ach.id)}
											className="font-pixel text-[9px] px-2 py-1 cursor-pointer"
											style={{
												background: '#c8a04a',
												color: '#1a1208',
												minHeight: 28,
											}}
										>
											수령
										</button>
									)}
									{claimed && (
										<span className="font-pixel text-[8px] text-text-secondary line-through">
											수령 완료
										</span>
									)}
								</div>
							</div>

							{/* Progress bar (not achieved, has progress) */}
							{!achieved && progress > 0 && (
								<div className="mt-1.5">
									<div className="w-full h-[4px] bg-[rgba(0,0,0,0.3)] overflow-hidden">
										<div
											className="h-full"
											style={{
												width: `${Math.min(100, (progress / ach.target) * 100)}%`,
												background: '#c8a04a',
											}}
										/>
									</div>
									<span className="font-pixel text-[7px] text-text-secondary mt-0.5">
										{progress}/{ach.target.toLocaleString()}
									</span>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
