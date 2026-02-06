/**
 * id.js – UUID and unique ID generation
 *
 * Uses crypto.randomUUID when available, falls back to
 * crypto.getRandomValues-based generation. Zero dependencies.
 */

/** Generate a v4 UUID */
export function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Generate a short sortable ID (timestamp + random suffix) */
export function shortId() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}
