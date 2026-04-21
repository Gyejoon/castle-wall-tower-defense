import { initSentry } from './lib/sentry';

initSentry();

import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { requestWakeLock, setupWakeLockReacquire } from './lib/wakeLock';
import './styles/global.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
	throw new Error('Root element #root not found');
}

const isDsGallery =
	new URLSearchParams(window.location.search).get('ds') === '1';

// Lazy-load the design-system demo gallery so it doesn't inflate the main
// bundle for regular users — only fetched when `?ds=1` is in the URL.
const DesignSystemGallery = lazy(() =>
	import('./components/ds/__demos__/DesignSystemGallery').then((m) => ({
		default: m.DesignSystemGallery,
	})),
);

createRoot(rootElement).render(
	<StrictMode>
		{isDsGallery ? (
			<Suspense fallback={null}>
				<DesignSystemGallery />
			</Suspense>
		) : (
			<App />
		)}
	</StrictMode>,
);

// Screen orientation lock (portrait)
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
