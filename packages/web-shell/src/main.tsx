import { initSentry } from './lib/sentry';

initSentry();

import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App, AssetReviewApp } from './App';
import { requestWakeLock, setupWakeLockReacquire } from './lib/wakeLock';
import './styles/global.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
	throw new Error('Root element #root not found');
}

const isDsGallery =
	new URLSearchParams(window.location.search).get('ds') === '1';
const isAssetReview = window.location.pathname.startsWith('/asset-review');

// Lazy-load the design-system demo gallery so it doesn't inflate the main
// bundle for regular users — only fetched when `?ds=1` is in the URL.
const DesignSystemGallery = lazy(() =>
	import('./components/ds/__demos__/DesignSystemGallery').then((m) => ({
		default: m.DesignSystemGallery,
	})),
);

createRoot(rootElement).render(
	<StrictMode>
		{isAssetReview ? (
			<AssetReviewApp />
		) : isDsGallery ? (
			<Suspense fallback={null}>
				<DesignSystemGallery />
			</Suspense>
		) : (
			<App />
		)}
	</StrictMode>,
);

// Screen orientation + wake locks are only relevant to the actual game;
// dev-only surfaces (asset review, design-system gallery) skip them.
if (!isAssetReview && !isDsGallery) {
	// Screen orientation lock (portrait) — game only.
	(
		screen.orientation as ScreenOrientation & {
			lock?: (o: string) => Promise<void>;
		}
	)
		?.lock?.('portrait')
		.catch(() => {
			// Orientation lock not supported or denied
		});

	// Wake lock — keep screen on during gameplay
	requestWakeLock();
	setupWakeLockReacquire();
}
