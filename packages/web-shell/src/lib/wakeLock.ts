let wakeLockSentinel: WakeLockSentinel | null = null;

export async function requestWakeLock(): Promise<void> {
	if (!('wakeLock' in navigator)) return;

	try {
		wakeLockSentinel = await navigator.wakeLock.request('screen');
		wakeLockSentinel.addEventListener('release', () => {
			wakeLockSentinel = null;
		});
	} catch {
		// Wake Lock request failed (e.g., low battery)
	}
}

export function releaseWakeLock(): void {
	wakeLockSentinel?.release();
	wakeLockSentinel = null;
}

export function setupWakeLockReacquire(): void {
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible' && !wakeLockSentinel) {
			requestWakeLock();
		}
	});
}
