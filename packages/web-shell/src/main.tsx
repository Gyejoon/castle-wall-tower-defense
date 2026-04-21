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

// 회전 고정/wake lock은 게임 화면에서만 적용.
if (!isAssetReview && !isDsGallery) {
	(
		screen.orientation as ScreenOrientation & {
			lock?: (o: string) => Promise<void>;
		}
	)
		?.lock?.('portrait')
		.catch(() => {});

	requestWakeLock();
	setupWakeLockReacquire();
}
