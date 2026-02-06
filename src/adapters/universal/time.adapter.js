/**
 * time.adapter.js – Performance timing utilities
 *
 * High-resolution timestamps and duration measurement
 * for telemetry and scheduling.
 */

export class TimeAdapter {
  /** High-resolution timestamp (ms) */
  now() {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  /** Unix timestamp (ms) */
  unix() {
    return Date.now();
  }

  /** Measure the duration of an async function */
  async measure(label, fn) {
    const start = this.now();
    const result = await fn();
    const duration = this.now() - start;
    return { label, duration, result };
  }

  /** ISO timestamp string */
  iso() {
    return new Date().toISOString();
  }
}
