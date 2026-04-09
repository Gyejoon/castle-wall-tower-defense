import { ALL_TOWERS, DEFAULT_DECK_IDS } from '@gld/shared';
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
		try {
			useMetaStore.getState().loadSave();
			// Sync persisted state to gameStore (created before loadSave runs)
			const meta = useMetaStore.getState();
			const validIds = new Set(ALL_TOWERS.map((t) => t.id));
			const sanitizedDeck = (meta.selectedDeck ?? []).filter((id) =>
				validIds.has(id),
			);
			const safeDeck =
				sanitizedDeck.length === 4 ? sanitizedDeck : [...DEFAULT_DECK_IDS];
			const currentDeck = meta.selectedDeck ?? [];
			const deckChanged =
				safeDeck.length !== currentDeck.length ||
				safeDeck.some((id, i) => id !== currentDeck[i]);
			if (deckChanged) {
				useMetaStore.getState().setSelectedDeck(safeDeck);
			}
			useGameStore.setState({
				selectedDeck: safeDeck,
				bgmVolume: meta.settings.bgmVolume,
				sfxVolume: meta.settings.sfxVolume,
				colorblindMode: meta.settings.colorblindMode,
				screenShake: meta.settings.screenShake,
			});
			useMetaStore.getState().refreshMissions();
			useMetaStore.getState().recordAttendance();
		} catch (err) {
			console.error('[GLD] Boot sequence failed:', err);
		}
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
		<div className="w-full h-full" style={{ filter, height: '100%' }}>
			{content}
		</div>
	);
}
