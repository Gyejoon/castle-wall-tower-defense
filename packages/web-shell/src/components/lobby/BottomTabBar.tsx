import { uiMobileArt } from '../../assets/uiMobileArt';
import { type LobbyTab, useGameStore } from '../../stores/gameStore';
import { cn } from '../../utils/cn';

const tabs: Array<{
	id: LobbyTab;
	label: string;
	activeIcon: string;
	inactiveIcon: string;
}> = [
	{
		id: 'home',
		label: '마당',
		activeIcon: uiMobileArt.homeTabIconActive,
		inactiveIcon: uiMobileArt.homeTabIconInactive,
	},
	{
		id: 'collection',
		label: '전쟁탁자',
		activeIcon: uiMobileArt.collectionTabIconActive,
		inactiveIcon: uiMobileArt.collectionTabIconInactive,
	},
	{
		id: 'missions',
		label: '임무',
		activeIcon: uiMobileArt.missionTabIconActive,
		inactiveIcon: uiMobileArt.missionTabIconInactive,
	},
	{
		id: 'achievements' as LobbyTab,
		label: '업적',
		activeIcon: uiMobileArt.missionTabIconActive,
		inactiveIcon: uiMobileArt.missionTabIconInactive,
	},
	{
		id: 'settings',
		label: '영주실',
		activeIcon: uiMobileArt.settingsTabIconActive,
		inactiveIcon: uiMobileArt.settingsTabIconInactive,
	},
];

export function BottomTabBar({ disabled = false }: { disabled?: boolean }) {
	const lobbyTab = useGameStore((s) => s.lobbyTab);
	const setLobbyTab = useGameStore((s) => s.setLobbyTab);

	return (
		<div
			role="tablist"
			aria-label="로비 탭"
			className="flex justify-around items-center bg-[rgba(26,18,8,0.95)] border-t border-border"
			style={{
				padding: '6px 0 calc(6px + env(safe-area-inset-bottom, 0px))',
			}}
		>
			{tabs.map((tab) => {
				const isActive = lobbyTab === tab.id;
				return (
					<button
						type="button"
						key={tab.id}
						role="tab"
						aria-selected={isActive}
						aria-label={tab.label}
						aria-controls={`tabpanel-${tab.id}`}
						disabled={disabled}
						onClick={() => !disabled && setLobbyTab(tab.id)}
						className={cn(
							'flex flex-col items-center gap-[3px] px-4 py-1.5 bg-transparent border-none min-w-[60px] touch-manipulation',
							disabled
								? 'cursor-not-allowed opacity-50'
								: 'cursor-pointer opacity-100',
						)}
					>
						<img
							src={isActive ? tab.activeIcon : tab.inactiveIcon}
							alt=""
							width={24}
							height={24}
							className="[image-rendering:pixelated]"
							aria-hidden="true"
						/>
						<span
							className={cn(
								'tab-label font-pixel text-[11px] transition-colors duration-150',
								isActive ? 'text-gold' : 'text-text-secondary',
							)}
						>
							{tab.label}
						</span>
					</button>
				);
			})}
		</div>
	);
}
