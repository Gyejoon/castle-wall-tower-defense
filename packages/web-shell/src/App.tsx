import { ALL_TOWERS, DEFAULT_DECK_IDS } from '@gld/shared';
import { lazy, Suspense, useEffect } from 'react';
import { uiMobileArt } from './assets/uiMobileArt';
import { LobbyPage } from './pages/LobbyPage';
import { MetaForgePage } from './pages/MetaForgePage';
import { useAuthStore } from './stores/authStore';
import { useGameStore } from './stores/gameStore';
import { useMetaStore } from './stores/metaStore';
import { preloadImages } from './utils/preloadAssets';

const GamePage = lazy(async () =>
	import('./pages/GamePage').then((m) => ({ default: m.GamePage })),
);

// Auth/ranking UI is only reached after user interaction, so defer the bundle
// until first open. supabase-js lives in the 'supabase' manualChunk, but these
// UI components + their wiring add another ~20KB that doesn't belong in the
// critical-path index chunk.
const AuthModal = lazy(async () =>
	import('./components/auth/AuthModal').then((m) => ({ default: m.AuthModal })),
);
const ProfileSetupModal = lazy(async () =>
	import('./components/auth/ProfileSetupModal').then((m) => ({
		default: m.ProfileSetupModal,
	})),
);
const ProfilePage = lazy(async () =>
	import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);

const AssetReviewPage = lazy(async () =>
	import('./asset-review/AssetReviewPage').then((m) => ({
		default: m.AssetReviewPage,
	})),
);

function LoadingScreen() {
	return (
		<div className="w-full h-full flex flex-col items-center bg-bg pt-[40dvh]">
			<div
				className="font-pixel text-[15px] text-accent"
				style={{ letterSpacing: '0.16em' }}
			>
				&gt;_ 전장 구축
			</div>
			<div
				className="font-pixel text-[10px] text-text-secondary mt-2 matchmaking-dots"
				style={{ letterSpacing: '0.1em' }}
			>
				타워 배치 준비
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

export function AssetReviewApp() {
	return (
		<Suspense fallback={<LoadingScreen />}>
			<AssetReviewPage />
		</Suspense>
	);
}

export function App() {
	const runStatus = useGameStore((s) => s.runStatus);
	const pushToast = useGameStore((s) => s.pushToast);
	const colorblindMode = useGameStore((s) => s.colorblindMode);
	const profilePageOpen = useGameStore((s) => s.profilePageOpen);

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
		} catch (err) {
			console.error('[GLD] Boot sequence failed:', err);
		}
		useAuthStore
			.getState()
			.hydrate()
			.catch((err) => console.error('[GLD] auth hydrate failed', err));
		// 로비 진입 시 UI 이미지 pop-in 방지를 위한 사전 로드 (블로킹 없음)
		preloadImages(Object.values(uiMobileArt));
		const onSaveError = () =>
			pushToast('저장 공간 부족! 데이터가 저장되지 않을 수 있습니다', 'error');
		window.addEventListener('gld-save-error', onSaveError);
		return () => window.removeEventListener('gld-save-error', onSaveError);
	}, [pushToast]);

	const filter = COLORBLIND_FILTERS[colorblindMode];

	// 페이지 전환 fade 키 — lobby / metaForge / GamePage 세 경로.
	// building/running/victory/defeat는 모두 GamePage이므로 같은 phase로 묶어
	// Phaser scene이 매 전이마다 재초기화되지 않도록 한다. metaForge는 별도
	// phase로 두어 lobby ↔ metaForge 전환도 부드럽게 fade 한다.
	const phase: 'lobby' | 'metaForge' | 'battle' =
		runStatus === 'lobby'
			? 'lobby'
			: runStatus === 'metaForge'
				? 'metaForge'
				: 'battle';

	const content: React.ReactNode =
		runStatus === 'lobby' ? (
			<LobbyPage />
		) : runStatus === 'metaForge' ? (
			<MetaForgePage />
		) : (
			<Suspense fallback={<LoadingScreen />}>
				<GamePage />
			</Suspense>
		);

	return (
		<div className="w-full h-full" style={{ filter, height: '100%' }}>
			<div
				key={phase}
				className="h-full"
				style={{ animation: 'fadeSlideIn 220ms ease-out' }}
			>
				{content}
			</div>
			{runStatus === 'lobby' && profilePageOpen && (
				<Suspense fallback={null}>
					<ProfilePage />
				</Suspense>
			)}
			<Suspense fallback={null}>
				<AuthModal />
				<ProfileSetupModal />
			</Suspense>
		</div>
	);
}
