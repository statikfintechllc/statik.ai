/**
 * Statik.ai Service Worker
 * Handles offline caching, lifecycle management, and background tasks.
 * Zero dependencies – runs entirely in the browser.
 */

const CACHE_NAME = 'statik-v0.1.0';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/styles/base.css',
  './assets/styles/chat.css',
  './assets/styles/inspector.css',
  './bootstrap/boot.js'
];

/* ── Install ────────────────────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

/* ── Activate ───────────────────────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── Fetch ──────────────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
