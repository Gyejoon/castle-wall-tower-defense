import { initSentry } from './lib/sentry';

initSentry();

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { DesignSystemGallery } from './components/ds/__demos__/DesignSystemGallery';
import { requestWakeLock, setupWakeLockReacquire } from './lib/wakeLock';
import './styles/global.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
	throw new Error('Root element #root not found');
}

const isDsGallery =
	new URLSearchParams(window.location.search).get('ds') === '1';

createRoot(rootElement).render(
	<StrictMode>{isDsGallery ? <DesignSystemGallery /> : <App />}</StrictMode>,
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
