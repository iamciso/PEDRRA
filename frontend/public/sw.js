// PEDRRA Service Worker — Offline support (#1 PWA)
const CACHE_NAME = 'pedrra-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/logo.png',
  '/template/edps_logo.png',
  '/template/content_bg.jpg',
  '/template/cover_bg.jpg',
  '/template/section_bg.png',
];

// Install: cache static assets, immediately activate
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(STATIC_ASSETS).catch(() => {})
    )
  );
  self.skipWaiting();
});

// Message handler: allow page to request cache clear
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Skip non-GET, socket.io requests
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/socket.io')) return;

  // Network-first for API AND JS/CSS assets (ensures deploys are picked up)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/assets/')) {
    // Network-first for API (with cache fallback for offline reads)
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for static assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return res;
      });
    }).catch(() => {
      // Offline fallback for navigation requests
      if (e.request.mode === 'navigate') {
        return caches.match('/');
      }
    })
  );
});
