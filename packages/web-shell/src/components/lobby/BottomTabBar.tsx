import { uiMobileArt } from '../../assets/uiMobileArt';
import { type LobbyTab, useGameStore } from '../../stores/gameStore';
import { cn } from '../../utils/cn';

interface TabDef {
	id: LobbyTab;
	label: string;
	activeIcon: string;
	inactiveIcon: string;
}

const tabs: [TabDef, TabDef, TabDef] = [
	{
		id: 'collection',
		label: '전쟁탁자',
		activeIcon: uiMobileArt.collectionTabIconActive,
		inactiveIcon: uiMobileArt.collectionTabIconInactive,
	},
	{
		id: 'home',
		label: '마당',
		activeIcon: uiMobileArt.homeTabIconActive,
		inactiveIcon: uiMobileArt.homeTabIconInactive,
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
			className="relative flex justify-around items-end bg-[rgba(20,14,6,0.98)] border-t-2 border-border"
			style={{
				paddingBottom: 'calc(4px + env(safe-area-inset-bottom, 0px))',
			}}
		>
			{tabs.map((tab) => {
				const isActive = lobbyTab === tab.id;
				const isCenter = tab.id === 'home';

				if (isCenter) {
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
								'relative flex flex-col items-center -mt-5 px-5 pt-2.5 pb-1.5 border-2 touch-manipulation transition-all duration-200',
								disabled
									? 'cursor-not-allowed opacity-50'
									: 'cursor-pointer',
								isActive
									? 'border-gold bg-[rgba(240,208,96,0.1)] shadow-[0_-4px_16px_rgba(240,208,96,0.2)]'
									: 'border-border bg-[rgba(20,14,6,0.98)]',
							)}
						>
							<img
								src={isActive ? tab.activeIcon : tab.inactiveIcon}
								alt=""
								width={30}
								height={30}
								className="[image-rendering:pixelated]"
								aria-hidden="true"
							/>
							<span
								className={cn(
									'font-pixel text-[11px] mt-1 transition-colors duration-150',
									isActive ? 'text-gold' : 'text-text-secondary',
								)}
							>
								{tab.label}
							</span>
						</button>
					);
				}

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
							'flex flex-col items-center gap-[2px] px-5 py-2 bg-transparent border-none min-w-[60px] touch-manipulation',
							disabled
								? 'cursor-not-allowed opacity-50'
								: 'cursor-pointer',
						)}
					>
						<img
							src={isActive ? tab.activeIcon : tab.inactiveIcon}
							alt=""
							width={22}
							height={22}
							className="[image-rendering:pixelated]"
							aria-hidden="true"
						/>
						<span
							className={cn(
								'font-pixel text-[10px] transition-colors duration-150',
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
