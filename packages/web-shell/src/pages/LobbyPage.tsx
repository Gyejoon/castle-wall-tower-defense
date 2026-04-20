import { BottomTabBar } from '../components/lobby/BottomTabBar';
import { ProfileBar } from '../components/lobby/ProfileBar';
import { CollectionTab } from '../components/lobby/tabs/CollectionTab';
import { HomeTab } from '../components/lobby/tabs/HomeTab';
import { LeaderboardTab } from '../components/lobby/tabs/LeaderboardTab';
import { SettingsTab } from '../components/lobby/tabs/SettingsTab';
import { useGameStore } from '../stores/gameStore';

export function LobbyPage() {
	const lobbyTab = useGameStore((s) => s.lobbyTab);

	return (
		<div className="w-full h-full flex justify-center bg-bg">
			{/* Mobile shell container */}
			<div className="w-full max-w-[430px] h-full flex flex-col relative overflow-hidden bg-bg shadow-[0_0_40px_rgba(0,0,0,0.5)]">
				<ProfileBar />

				{/* Tab content area with crossfade */}
				<div className="relative flex-1 min-h-0 overflow-hidden">
					<div
						key={lobbyTab}
						className="absolute inset-0 flex flex-col"
						style={{
							animation:
								lobbyTab === 'home'
									? 'fadeIn 500ms ease-out'
									: 'fadeIn 200ms ease-out',
						}}
					>
						{lobbyTab === 'home' && <HomeTab />}
						{lobbyTab === 'collection' && <CollectionTab />}
						{lobbyTab === 'leaderboard' && <LeaderboardTab />}
						{lobbyTab === 'settings' && <SettingsTab />}
					</div>
				</div>

				<BottomTabBar />
			</div>
		</div>
	);
}
