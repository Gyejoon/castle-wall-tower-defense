import { uiMobileArt } from '../../assets/uiMobileArt';
import { type LobbyTab, useGameStore } from '../../stores/gameStore';
import { cn } from '../../utils/cn';

interface TabDef {
	id: LobbyTab;
	label: string;
	activeIcon: string;
	inactiveIcon: string;
}

const leftTab: TabDef = {
	id: 'collection',
	label: '전쟁탁자',
	activeIcon: uiMobileArt.collectionTabIconActive,
	inactiveIcon: uiMobileArt.collectionTabIconInactive,
};

const centerTab: TabDef = {
	id: 'home',
	label: '마당',
	activeIcon: uiMobileArt.homeTabIconActive,
	inactiveIcon: uiMobileArt.homeTabIconInactive,
};

const rightTab: TabDef = {
	id: 'settings',
	label: '영주실',
	activeIcon: uiMobileArt.settingsTabIconActive,
	inactiveIcon: uiMobileArt.settingsTabIconInactive,
};

function SideTab({
	tab,
	isActive,
	disabled,
	onClick,
}: {
	tab: TabDef;
	isActive: boolean;
	disabled: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			role="tab"
			aria-selected={isActive}
			aria-label={tab.label}
			aria-controls={`tabpanel-${tab.id}`}
			disabled={disabled}
			onClick={() => !disabled && onClick()}
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
				width={20}
				height={20}
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
}

export function BottomTabBar({ disabled = false }: { disabled?: boolean }) {
	const lobbyTab = useGameStore((s) => s.lobbyTab);
	const setLobbyTab = useGameStore((s) => s.setLobbyTab);
	const isCenterActive = lobbyTab === centerTab.id;

	return (
		<div
			role="tablist"
			aria-label="로비 탭"
			className="flex justify-around items-end bg-[rgba(26,18,8,0.95)] border-t border-border"
			style={{
				padding: '0 0 calc(4px + env(safe-area-inset-bottom, 0px))',
			}}
		>
			{/* Left: 전쟁탁자 */}
			<SideTab
				tab={leftTab}
				isActive={lobbyTab === leftTab.id}
				disabled={disabled}
				onClick={() => setLobbyTab(leftTab.id)}
			/>

			{/* Center: 마당 (elevated, larger) */}
			<button
				type="button"
				role="tab"
				aria-selected={isCenterActive}
				aria-label={centerTab.label}
				aria-controls={`tabpanel-${centerTab.id}`}
				disabled={disabled}
				onClick={() => !disabled && setLobbyTab(centerTab.id)}
				className={cn(
					'flex flex-col items-center gap-1 -mt-4 px-3 py-2 border-2 touch-manipulation transition-all duration-200',
					disabled
						? 'cursor-not-allowed opacity-50'
						: 'cursor-pointer opacity-100',
					isCenterActive
						? 'border-gold bg-[rgba(240,208,96,0.12)] shadow-[0_0_12px_rgba(240,208,96,0.25)]'
						: 'border-border bg-[rgba(26,18,8,0.95)]',
				)}
			>
				<img
					src={
						isCenterActive
							? centerTab.activeIcon
							: centerTab.inactiveIcon
					}
					alt=""
					width={28}
					height={28}
					className="[image-rendering:pixelated]"
					aria-hidden="true"
				/>
				<span
					className={cn(
						'font-pixel text-[11px] transition-colors duration-150',
						isCenterActive ? 'text-gold' : 'text-text-secondary',
					)}
				>
					{centerTab.label}
				</span>
			</button>

			{/* Right: 영주실 */}
			<SideTab
				tab={rightTab}
				isActive={lobbyTab === rightTab.id}
				disabled={disabled}
				onClick={() => setLobbyTab(rightTab.id)}
			/>
		</div>
	);
}
