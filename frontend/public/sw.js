const CACHE_NAME = 'softnix-attend-v1';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/softnix-logo.jpg',
  '/login',
  '/signup',
  '/dashboard'
];

// 1. Service Worker Install Event - Cache Core Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching core PWA static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache addAll warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Service Worker Activate Event - Clean Up Old Caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Service Worker Fetch Event - Cache First for Assets, Network First for APIs
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET requests or browser extension requests
  if (req.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Network-first strategy for API endpoints (/api/*)
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(req)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return caches.match(req).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return new Response(
              JSON.stringify({
                success: false,
                message: 'You are currently offline. Please check your network connection.',
                offline: true
              }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // Stale-while-revalidate / Cache-first strategy for UI static bundles and images
  event.respondWith(
    caches.match(req).then((cachedResponse) => {
      const fetchPromise = fetch(req).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
