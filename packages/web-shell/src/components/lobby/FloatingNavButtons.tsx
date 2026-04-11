import { uiMobileArt } from '../../assets/uiMobileArt';
import { useClaimableCounts } from '../../hooks/useClaimableCounts';
import { useGameStore } from '../../stores/gameStore';

export function FloatingNavButtons() {
	const setLobbyTab = useGameStore((s) => s.setLobbyTab);
	const { claimableMissions, claimableAchievements } = useClaimableCounts();

	const buttons = [
		{
			id: 'missions' as const,
			label: '임무',
			icon: uiMobileArt.missionTabIconActive,
			count: claimableMissions,
		},
		{
			id: 'achievements' as const,
			label: '업적',
			icon: uiMobileArt.trophyIcon,
			count: claimableAchievements,
		},
	];

	return (
		<div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
			{buttons.map((btn) => {
				const ariaLabel =
					btn.count > 0 ? `${btn.label} (${btn.count}개 수령 가능)` : btn.label;
				return (
					<button
						key={btn.id}
						type="button"
						aria-label={ariaLabel}
						onClick={() => setLobbyTab(btn.id)}
						className="relative flex flex-col items-center justify-center w-[44px] h-[44px] rounded-xl border border-border cursor-pointer touch-manipulation active:scale-95 transition-transform gap-0.5"
						style={{ background: 'var(--color-panel-85)' }}
					>
						<img
							src={btn.icon}
							alt=""
							width={20}
							height={20}
							className="[image-rendering:pixelated]"
						/>
						<span className="font-pixel text-[10px] text-text-secondary leading-none">
							{btn.label}
						</span>
						{btn.count > 0 && (
							<span
								aria-hidden="true"
								className="claimable-badge absolute -top-1 -right-1 min-w-[16px] h-4 px-[3px] rounded-full bg-danger text-[8px] text-white font-pixel flex items-center justify-center border border-border leading-none"
							>
								{btn.count > 99 ? '99+' : btn.count}
							</span>
						)}
					</button>
				);
			})}
		</div>
	);
}
