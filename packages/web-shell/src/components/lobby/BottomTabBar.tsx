import { core } from '@gld/shared';
import { uiMobileArt } from '../../assets/uiMobileArt';
import { type LobbyTab, useGameStore } from '../../stores/gameStore';
import { cn } from '../../utils/cn';

// core.gold + alpha hex (CSS Color Level 4 8-digit hex)
const GOLD_GLOW_OUTER = `${core.gold}26`; // 15% alpha
const GOLD_GLOW_INNER = `${core.gold}1a`; // 10% alpha

interface TabDef {
	id: LobbyTab;
	label: string;
	activeIcon: string;
	inactiveIcon: string;
}

// Phase 6: missions/achievements tabs removed with the scenario purge.
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
		label: '설정',
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
			className="relative flex items-end bg-panel border-t-2 border-border"
			style={{
				paddingBottom: 'env(safe-area-inset-bottom, 0px)',
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
								'relative z-10 flex-1 flex flex-col items-center -mt-3 mx-1 pt-3 pb-2 border-2 touch-manipulation transition-all duration-200',
								disabled
									? 'cursor-not-allowed opacity-50'
									: 'cursor-pointer active:scale-95',
								isActive ? 'border-gold bg-panel' : 'border-border/50 bg-panel',
							)}
							style={
								isActive
									? {
											boxShadow: `0 -2px 12px ${GOLD_GLOW_OUTER}, inset 0 1px 0 ${GOLD_GLOW_INNER}`,
										}
									: undefined
							}
						>
							{isActive && (
								<div
									className="absolute -top-[2px] left-3 right-3 h-[2px]"
									style={{
										background:
											'linear-gradient(90deg, transparent, var(--color-gold), transparent)',
									}}
								/>
							)}
							<img
								src={isActive ? tab.activeIcon : tab.inactiveIcon}
								alt=""
								width={28}
								height={28}
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
							'flex-1 flex flex-col items-center gap-1 py-2.5 bg-transparent border-none touch-manipulation transition-all duration-150',
							disabled
								? 'cursor-not-allowed opacity-50'
								: 'cursor-pointer active:scale-95',
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
								'font-pixel text-[11px] transition-colors duration-150',
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
