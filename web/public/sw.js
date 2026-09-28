// UMeet service worker.
// Intentionally minimal: we cache only the static app shell so the PWA can be
// installed, but we NEVER cache signaling, WebSocket, or media traffic, and we
// do not pretend meetings work offline — an active internet connection is
// always required for a call.

const CACHE = 'umeet-shell-v1';
const SHELL = ['/', '/create', '/join', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept non-GET, cross-origin, WebSocket, or signaling traffic.
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/socket.io')
  ) {
    return;
  }

  // Network-first for navigations so meeting pages always get fresh code.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/') as Promise<Response>),
    );
    return;
  }

  // Cache-first for other static same-origin assets.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});
