import { initSentry } from './lib/sentry';

initSentry();

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { requestWakeLock, setupWakeLockReacquire } from './lib/wakeLock';
import './styles/global.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
	throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
	<StrictMode>
		<App />
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
