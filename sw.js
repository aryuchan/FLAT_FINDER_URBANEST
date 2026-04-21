// sw.js — Production Service Worker (v16)
// Fixes: Performance — Portal caching for offline resilience

const CACHE_NAME = 'urbanest-v16'; // Fixes: Cache version bump
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
  'https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap'
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
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
