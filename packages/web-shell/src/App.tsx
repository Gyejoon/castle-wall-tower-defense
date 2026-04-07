import { lazy, Suspense, useEffect } from 'react';
import { useMissionTracker } from './hooks/useMissionTracker';
import { LobbyPage } from './pages/LobbyPage';
import { useGameStore } from './stores/gameStore';
import { useMetaStore } from './stores/metaStore';

const WorldMapPage = lazy(async () =>
	import('./pages/WorldMapPage').then((m) => ({ default: m.WorldMapPage })),
);

const StageDetailPage = lazy(async () =>
	import('./pages/StageDetailPage').then((m) => ({
		default: m.StageDetailPage,
	})),
);

const GamePage = lazy(async () =>
	import('./pages/GamePage').then((m) => ({ default: m.GamePage })),
);

function LoadingScreen() {
	return (
		<div
			className="min-h-screen flex items-center justify-center text-text-secondary"
			style={{ letterSpacing: '0.12em' }}
		>
			그리드 로딩 중...
		</div>
	);
}

const COLORBLIND_FILTERS: Record<string, string> = {
	off: 'none',
	protan: 'url(#protan-filter)',
	deutan: 'url(#deutan-filter)',
	tritan: 'url(#tritan-filter)',
};

export function App() {
	const runStatus = useGameStore((s) => s.runStatus);
	const pushToast = useGameStore((s) => s.pushToast);
	const colorblindMode = useGameStore((s) => s.colorblindMode);

	useEffect(() => {
		useMetaStore.getState().loadSave();
		useMetaStore.getState().refreshMissions();
		useMetaStore.getState().recordAttendance();
		const onSaveError = () =>
			pushToast('저장 공간 부족! 데이터가 저장되지 않을 수 있습니다', 'error');
		window.addEventListener('gld-save-error', onSaveError);
		return () => window.removeEventListener('gld-save-error', onSaveError);
	}, [pushToast]);

	useMissionTracker();

	const filter = COLORBLIND_FILTERS[colorblindMode];

	let content: React.ReactNode;
	switch (runStatus) {
		case 'lobby':
			content = <LobbyPage />;
			break;
		case 'stageSelect':
			content = (
				<Suspense fallback={<LoadingScreen />}>
					<WorldMapPage />
				</Suspense>
			);
			break;
		case 'stageDetail':
			content = (
				<Suspense fallback={<LoadingScreen />}>
					<StageDetailPage />
				</Suspense>
			);
			break;
		default:
			// building, running, victory, defeat → GamePage (Phaser)
			content = (
				<Suspense fallback={<LoadingScreen />}>
					<GamePage />
				</Suspense>
			);
			break;
	}

	return (
		<div
			className="w-full h-full"
			style={{ filter, height: '100%' }}
		>
			{content}
		</div>
	);
}
