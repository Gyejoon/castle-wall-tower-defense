import { uiMobileArt } from '../../assets/uiMobileArt';
import { type LobbyTab, useGameStore } from '../../stores/gameStore';
import { colors, fonts } from '../../styles/tokens';

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
			style={{
				display: 'flex',
				justifyContent: 'space-around',
				alignItems: 'center',
				padding: '6px 0 calc(6px + env(safe-area-inset-bottom, 0px))',
				background: 'rgba(26, 18, 8, 0.95)',
				borderTop: `1px solid ${colors.border}`,
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
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: '3px',
							padding: '6px 16px',
							background: 'none',
							border: 'none',
							cursor: disabled ? 'not-allowed' : 'pointer',
							minWidth: '60px',
							touchAction: 'manipulation',
							opacity: disabled ? 0.5 : 1,
						}}
					>
						<img
							src={isActive ? tab.activeIcon : tab.inactiveIcon}
							alt=""
							width={24}
							height={24}
							style={{ imageRendering: 'pixelated' }}
							aria-hidden="true"
						/>
						<span
							className="tab-label"
							style={{
								fontFamily: fonts.pixel,
								fontSize: '7px',
								color: isActive ? colors.gold : colors.textSecondary,
								transition: 'color 0.15s',
							}}
						>
							{tab.label}
						</span>
					</button>
				);
			})}
		</div>
	);
}
