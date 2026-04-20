import { uiMobileArt } from '../../assets/uiMobileArt';
import { type LobbyTab, useGameStore } from '../../stores/gameStore';
import { cn } from '../../utils/cn';

interface TabDef {
	id: LobbyTab;
	label: string;
	activeIcon: string;
	inactiveIcon: string;
}

// 4탭 구성: 전쟁탁자 / 마당(elevated) / 랭킹 / 설정
// 랭킹 탭은 별도 active/inactive 에셋이 없어 trophyIcon 단일 에셋을 재사용하고
// 활성 상태는 opacity·색상 전환으로 처리한다.
// TODO(assets): ranking-tab-icon-{active,inactive}.webp 전용 스프라이트 제작 후 교체.
const tabs: [TabDef, TabDef, TabDef, TabDef] = [
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
		id: 'leaderboard',
		label: '랭킹',
		activeIcon: uiMobileArt.trophyIcon,
		inactiveIcon: uiMobileArt.trophyIcon,
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
											boxShadow:
												'0 -2px 12px rgba(240,208,96,0.15), inset 0 1px 0 rgba(240,208,96,0.1)',
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

				const isLeaderboard = tab.id === 'leaderboard';
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
							'flex-1 flex flex-col items-center gap-1 py-2.5 min-h-[44px] bg-transparent border-none touch-manipulation transition-all duration-150',
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
							className={cn(
								'[image-rendering:pixelated] transition-opacity duration-150',
								isLeaderboard && !isActive && 'opacity-55',
							)}
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
