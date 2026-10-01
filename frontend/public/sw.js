// Service worker: installable PWA + offline fallback.
// Only same-origin static assets are cached. Pages are network-first (so a new
// deploy is picked up immediately) and API / Supabase calls are never cached.
const CACHE_NAME = 'softnix-attend-v4';
const PRECACHE = ['/manifest.json', '/softnix-logo.jpg', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('push', (event) => {
  let payload = { title: 'Softnix Attend', body: 'New attendance update', url: '/dashboard' };
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch (e) {
      payload.body = event.data.text();
    }
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/softnix-logo.jpg',
      badge: '/softnix-logo.jpg',
      data: { url: payload.url || '/dashboard' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow ? self.clients.openWindow(targetUrl) : undefined;
    })
  );
});

const OFFLINE_HTML = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title></head>
<body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;color:#111827">
<div style="text-align:center;padding:24px"><h1 style="font-size:20px">You are offline</h1><p style="color:#6b7280">Reconnect to clock in or view your attendance.</p><button onclick="location.reload()" style="margin-top:12px;padding:12px 24px;border:0;border-radius:14px;background:#4F46E5;color:#fff;font-weight:700;font-size:15px">Retry</button></div><script>addEventListener("online",function(){location.reload()})</script></body></html>`;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Never touch cross-origin requests (backend API, Supabase auth, fonts CDN)
  if (url.origin !== self.location.origin) return;

  // Page navigations: always go to the network; show a small offline page if that fails
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }))
    );
    return;
  }

  // Immutable hashed build assets and images: cache-first
  const isStatic = url.pathname.startsWith('/_next/static/') || /\.(png|jpe?g|svg|ico|webp|woff2?)$/.test(url.pathname);
  if (!isStatic) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return response;
      });
    })
  );
});
