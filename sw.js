// sw.js — Production Service Worker (v18.0)
const CACHE_NAME = "urbanest-v2";
const ASSETS = [
  "/",
  "/index.html",
  "/tenant_index.html",
  "/owner_index.html",
  "/admin_index.html",
  "/style.css",
  "/ff-core.js",
  "/landing.js",
  "/manifest.json",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)));
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Strategy: Network-first for API, Cache-first for assets
  if (url.pathname.startsWith("/api")) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
  } else {
    e.respondWith(
      caches.match(e.request).then((res) => res || fetch(e.request)),
    );
  }
});
