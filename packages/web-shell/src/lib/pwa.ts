export function registerSWUpdate(onNeedRefresh: () => void): void {
	if (!('serviceWorker' in navigator)) return;

	navigator.serviceWorker.ready.then((registration) => {
		registration.addEventListener('updatefound', () => {
			const newWorker = registration.installing;
			if (!newWorker) return;

			newWorker.addEventListener('statechange', () => {
				if (
					newWorker.state === 'installed' &&
					navigator.serviceWorker.controller
				) {
					onNeedRefresh();
				}
			});
		});
	});
}

export function applyUpdate(): void {
	navigator.serviceWorker.ready.then((registration) => {
		registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
	});
	window.location.reload();
}
