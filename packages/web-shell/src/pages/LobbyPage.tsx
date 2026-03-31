import { useState } from 'react';
import { BottomTabBar } from '../components/lobby/BottomTabBar';
import { ProfileBar } from '../components/lobby/ProfileBar';
import { CollectionTab } from '../components/lobby/tabs/CollectionTab';
import { HomeTab } from '../components/lobby/tabs/HomeTab';
import { SettingsTab } from '../components/lobby/tabs/SettingsTab';
import { useGameStore } from '../stores/gameStore';
import { colors } from '../styles/tokens';

export function LobbyPage() {
	const lobbyTab = useGameStore((s) => s.lobbyTab);
	const [isMatchmaking, setIsMatchmaking] = useState(false);

	return (
		<div
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				justifyContent: 'center',
				background: colors.bg,
			}}
		>
			{/* Mobile shell container */}
			<div
				style={{
					width: '100%',
					maxWidth: '430px',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					position: 'relative',
					overflow: 'hidden',
					background: colors.bg,
					boxShadow: '0 0 40px rgba(0,0,0,0.5)',
				}}
			>
				<ProfileBar />

				{/* Tab content area with crossfade */}
				<div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
					<div
						key={lobbyTab}
						style={{
							position: 'absolute',
							inset: 0,
							display: 'flex',
							flexDirection: 'column',
							animation:
								lobbyTab === 'home'
									? 'fadeIn 500ms ease-out'
									: 'fadeIn 200ms ease-out',
						}}
					>
						{lobbyTab === 'home' && (
							<HomeTab
								isMatchmaking={isMatchmaking}
								setIsMatchmaking={setIsMatchmaking}
							/>
						)}
						{lobbyTab === 'collection' && <CollectionTab />}
						{lobbyTab === 'settings' && <SettingsTab />}
					</div>
				</div>

				<BottomTabBar disabled={isMatchmaking} />
			</div>
		</div>
	);
}
