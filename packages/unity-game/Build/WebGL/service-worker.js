// Phase 0 no-op service worker. Explicitly unregisters itself so stale caches
// from any prior Phase experimentation do not serve outdated WebGL bytes.
// Phase 7 replaces with a real offline-first implementation.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach((c) => c.navigate(c.url));
  })());
});
