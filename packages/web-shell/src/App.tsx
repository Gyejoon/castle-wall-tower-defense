import { lazy, Suspense, useEffect } from 'react';
import { uiMobileArt } from './assets/uiMobileArt';
import { useMissionTracker } from './hooks/useMissionTracker';
import { LobbyPage } from './pages/LobbyPage';
import { useGameStore } from './stores/gameStore';
import { useMetaStore } from './stores/metaStore';
import { preloadImages } from './utils/preloadAssets';

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

type LoadingContext = 'map' | 'stage' | 'battle';

const LOADING_COPY: Record<LoadingContext, { title: string; sub: string }> = {
	map: { title: '>_ 월드맵 로딩', sub: '작전 지역 스캔 중' },
	stage: { title: '>_ 작전 브리핑', sub: '스테이지 정보 수신 중' },
	battle: { title: '>_ 전장 구축', sub: '타워 배치 준비' },
};

function LoadingScreen({ context }: { context: LoadingContext }) {
	const copy = LOADING_COPY[context];
	return (
		<div className="w-full h-full flex flex-col items-center bg-bg pt-[40dvh]">
			<div
				className="font-pixel text-[15px] text-accent"
				style={{ letterSpacing: '0.16em' }}
			>
				{copy.title}
			</div>
			<div
				className="font-pixel text-[10px] text-text-secondary mt-2 matchmaking-dots"
				style={{ letterSpacing: '0.1em' }}
			>
				{copy.sub}
			</div>
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
			useGameStore.setState({
				selectedDeck: meta.selectedDeck,
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
		// 로비 진입 시 UI 이미지 pop-in 방지를 위한 사전 로드 (블로킹 없음)
		preloadImages(Object.values(uiMobileArt));
		const onSaveError = () =>
			pushToast('저장 공간 부족! 데이터가 저장되지 않을 수 있습니다', 'error');
		window.addEventListener('gld-save-error', onSaveError);
		return () => window.removeEventListener('gld-save-error', onSaveError);
	}, [pushToast]);

	useMissionTracker();

	const filter = COLORBLIND_FILTERS[colorblindMode];

	// 페이지 전환 fade 키 — runStatus 전체가 아닌 라우트 단위로 묶는다.
	// building/running/victory/defeat는 모두 GamePage이므로 같은 phase로 묶어
	// Phaser scene이 매 전이마다 재초기화되지 않도록 한다.
	const phase: 'lobby' | 'map' | 'stage' | 'battle' =
		runStatus === 'lobby'
			? 'lobby'
			: runStatus === 'stageSelect'
				? 'map'
				: runStatus === 'stageDetail'
					? 'stage'
					: 'battle';

	let content: React.ReactNode;
	switch (runStatus) {
		case 'lobby':
			content = <LobbyPage />;
			break;
		case 'stageSelect':
			content = (
				<Suspense fallback={<LoadingScreen context="map" />}>
					<WorldMapPage />
				</Suspense>
			);
			break;
		case 'stageDetail':
			content = (
				<Suspense fallback={<LoadingScreen context="stage" />}>
					<StageDetailPage />
				</Suspense>
			);
			break;
		default:
			// building, running, victory, defeat → GamePage (Phaser)
			content = (
				<Suspense fallback={<LoadingScreen context="battle" />}>
					<GamePage />
				</Suspense>
			);
			break;
	}

	return (
		<div className="w-full h-full" style={{ filter, height: '100%' }}>
			<div
				key={phase}
				className="h-full"
				style={{ animation: 'fadeSlideIn 220ms ease-out' }}
			>
				{content}
			</div>
		</div>
	);
}
