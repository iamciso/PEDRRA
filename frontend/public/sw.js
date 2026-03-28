// PEDRRA Service Worker — SELF-DESTRUCT VERSION
// This SW immediately unregisters itself and clears all caches.
// This ensures users always get fresh content from the server.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => {
      // Unregister this service worker
      return self.registration.unregister();
    }).then(() => {
      // Reload all controlled pages to get fresh content
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => client.navigate(client.url));
      });
    })
  );
});

// Don't intercept ANY requests — let them go straight to the network
// This is a no-op fetch handler that just passes through
