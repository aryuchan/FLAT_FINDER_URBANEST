// sw.js — Final Production Service Worker (v17)
// Fixes: Bug #8 — Network-first for API routes

const CACHE_NAME = 'urbanest-v18.0'; // DEV NOTE: Bump this version whenever any static file changes!
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/tenant_index.html',
  '/owner_index.html',
  '/admin_index.html',
  '/style.css',
  '/ff-core.js',
  '/ff-auth.js',
  '/ff-tenant.js',
  '/ff-owner.js',
  '/ff-admin.js',
  '/app.js',
  '/landing.js',
  '/manifest.json'
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

  if (event.request.method !== 'GET') return;

  // FIX [8]: Network-only or Network-first for portal routes to prevent stale auth state
  const isPortalRoute = ['/tenant', '/owner', '/admin'].includes(url.pathname);

  if (url.pathname.startsWith('/api/') || isPortalRoute) {
    event.respondWith(
      fetch(event.request)
        .then((r) => {
          if (r.ok && !isPortalRoute) { // don't cache portal html
            const clone = r.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          }
          return r;
        })
        .catch(() => caches.match(event.request).then(r => r || new Response('You are offline. Please reconnect.', { status: 200, headers: { 'Content-Type': 'text/html' } })))
    );
  } else {
    // Cache-first for static assets
    event.respondWith(
      caches.match(event.request).then((r) => r || fetch(event.request).catch(() => new Response('You are offline. Please reconnect.', { status: 200, headers: { 'Content-Type': 'text/html' } })))
    );
  }
});
