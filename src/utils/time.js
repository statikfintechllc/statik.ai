/**
 * time.js – Timestamp utilities
 *
 * Consistent time handling across the system.
 */

/** Current Unix timestamp in milliseconds */
export function now() {
  return Date.now();
}

/** High-resolution timestamp (ms, fractional) */
export function hires() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

/** ISO 8601 formatted timestamp */
export function iso() {
  return new Date().toISOString();
}

/** Human-readable relative time (e.g. "3m ago") */
export function ago(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 1000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}
