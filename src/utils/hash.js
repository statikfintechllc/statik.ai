/**
 * hash.js – Hashing for deduplication
 *
 * Uses Web Crypto API for SHA-256 hashing.
 * Provides both async (crypto.subtle) and sync (simple) variants.
 */

/** SHA-256 hash of a string (async, uses WebCrypto) */
export async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Fast non-cryptographic hash (FNV-1a, 32-bit) for dedup */
export function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(36);
}
