// sw.js — Final Production Service Worker (v17)
// Fixes: Bug #8 — Network-first for API routes

const CACHE_NAME = 'urbanest-v17';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/tenant',
  '/owner',
  '/admin',
  '/style.css',
  '/ff-core.js',
  '/ff-auth.js',
  '/ff-tenant.js',
  '/ff-owner.js',
  '/ff-admin.js',
  '/app.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Fixes: Bug #8 — Never cache mutations
  if (event.request.method !== 'GET') return;

  // Fixes: Bug #8 — Network-first for API (always fresh)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((r) => {
          if (r.ok) {
            const clone = r.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return r;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first for static assets
    event.respondWith(
      caches.match(event.request).then((r) => r || fetch(event.request))
    );
  }
});
