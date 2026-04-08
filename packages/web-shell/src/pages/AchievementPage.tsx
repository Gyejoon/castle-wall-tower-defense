import { ACHIEVEMENTS } from '@gld/shared';
import { useState } from 'react';
import { DiamondIcon } from '../components/ui/CurrencyIcon';
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
							color:
								category === cat.id
									? 'var(--color-accent)'
									: 'var(--color-text-secondary)',
							borderBottom:
								category === cat.id
									? '2px solid var(--color-accent)'
									: '2px solid transparent',
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
										? 'color-mix(in srgb, var(--color-success) 8%, transparent)'
										: 'color-mix(in srgb, var(--color-accent) 10%, transparent)'
									: 'var(--color-panel)',
								borderColor:
									achieved && !claimed
										? 'var(--color-accent)'
										: 'var(--color-border)',
								opacity: achieved ? 1 : 0.7,
							}}
						>
							<div className="flex items-start justify-between gap-2">
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-1.5">
										{achieved ? (
											<img
												src="assets/ui/icon-complete.webp"
												alt=""
												width={12}
												height={12}
												className="[image-rendering:pixelated]"
											/>
										) : (
											<img
												src="assets/ui/icon-locked.webp"
												alt=""
												width={12}
												height={12}
												className="[image-rendering:pixelated]"
												style={{ opacity: progress > 0 ? 0.5 : 0.3 }}
											/>
										)}
										<span className="font-pixel text-[10px] text-text">
											{ach.name}
										</span>
									</div>
									<p className="font-pixel text-[8px] text-text-secondary mt-0.5">
										{ach.description}
									</p>
								</div>

								{/* Reward + claim */}
								<div className="flex flex-col items-end gap-1 shrink-0">
									<span className="font-pixel text-[9px] text-gold">
										<span className="inline-flex items-center gap-0.5">
											<DiamondIcon size={10} /> {ach.reward.diamond}
										</span>
									</span>
									{achieved && !claimed && (
										<button
											type="button"
											onClick={() => claimAchievement(ach.id)}
											className="font-pixel text-[9px] px-2 py-1 cursor-pointer"
											style={{
												background: 'var(--color-accent)',
												color: 'var(--color-bg)',
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
												background: 'var(--color-accent)',
											}}
										/>
									</div>
									<span className="font-pixel text-[7px] text-text-secondary mt-0.5">
										{progress.toLocaleString()}/{ach.target.toLocaleString()}
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
