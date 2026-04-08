import { uiMobileArt } from '../../assets/uiMobileArt';
import { useGameStore } from '../../stores/gameStore';

const buttons = [
	{
		id: 'missions' as const,
		label: '임무',
		icon: uiMobileArt.missionTabIconActive,
	},
	{ id: 'achievements' as const, label: '업적', icon: uiMobileArt.trophyIcon },
];

export function FloatingNavButtons() {
	const setLobbyTab = useGameStore((s) => s.setLobbyTab);
	return (
		<div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
			{buttons.map((btn) => (
				<button
					key={btn.id}
					type="button"
					aria-label={btn.label}
					onClick={() => setLobbyTab(btn.id)}
					className="flex flex-col items-center justify-center w-[44px] h-[44px] rounded-xl border border-border cursor-pointer touch-manipulation active:scale-95 transition-transform gap-0.5"
					style={{ background: 'var(--color-panel-85)' }}
				>
					<img
						src={btn.icon}
						alt=""
						width={20}
						height={20}
						className="[image-rendering:pixelated]"
					/>
					<span className="font-pixel text-[9px] text-text-secondary leading-none">
						{btn.label}
					</span>
				</button>
			))}
		</div>
	);
}
