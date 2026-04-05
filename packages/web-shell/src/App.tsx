import { lazy, Suspense, useEffect } from 'react';
import { LobbyPage } from './pages/LobbyPage';
import { useGameStore } from './stores/gameStore';
import { useMetaStore } from './stores/metaStore';
import { colors } from './styles/tokens';

const GamePage = lazy(async () =>
	import('./pages/GamePage').then((module) => ({ default: module.GamePage })),
);

function LoadingScreen() {
	return (
		<div
			style={{
				minHeight: '100vh',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				color: colors.textSecondary,
				letterSpacing: '0.12em',
			}}
		>
			그리드 로딩 중...
		</div>
	);
}

export function App() {
	const runStatus = useGameStore((s) => s.runStatus);

	const pushToast = useGameStore((s) => s.pushToast);

	useEffect(() => {
		useMetaStore.getState().loadSave();
		const onSaveError = () =>
			pushToast('저장 공간 부족! 데이터가 저장되지 않을 수 있습니다', 'error');
		window.addEventListener('gld-save-error', onSaveError);
		return () => window.removeEventListener('gld-save-error', onSaveError);
	}, [pushToast]);

	if (runStatus === 'lobby') {
		return <LobbyPage />;
	}

	return (
		<Suspense fallback={<LoadingScreen />}>
			<GamePage />
		</Suspense>
	);
}
