import { initSentry } from './lib/sentry';
initSentry();

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { requestWakeLock, setupWakeLockReacquire } from './lib/wakeLock';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Register service worker (injected by vite-plugin-pwa)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // SW registration failed — app still works without it
    });
  });
}

// Screen orientation lock (portrait)
(screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> })
  ?.lock?.('portrait')
  .catch(() => {
    // Orientation lock not supported or denied
  });

// Wake lock — keep screen on during gameplay
requestWakeLock();
setupWakeLockReacquire();
