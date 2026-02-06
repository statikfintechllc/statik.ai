/**
 * cache.js – Service Worker cache control
 *
 * Manages the static asset cache used by sw.js.
 * Provides programmatic cache updates and invalidation.
 */

const CACHE_NAME = 'statik-v0.1.0';

/** Add URLs to the cache */
export async function cacheAssets(urls) {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(urls);
}

/** Remove a URL from the cache */
export async function uncache(url) {
  const cache = await caches.open(CACHE_NAME);
  await cache.delete(url);
}

/** List all cached URLs */
export async function listCached() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  return keys.map((req) => req.url);
}

/** Clear the entire cache */
export async function clearCache() {
  await caches.delete(CACHE_NAME);
}

/** Get total cache size (approximate) */
export async function cacheSize() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  let total = 0;
  for (const req of keys) {
    const resp = await cache.match(req);
    if (resp) {
      const blob = await resp.blob();
      total += blob.size;
    }
  }
  return total;
}
