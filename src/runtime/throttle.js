/**
 * throttle.js – Rate limiting and backpressure
 *
 * Prevents any single unit or channel from flooding the bus.
 * Enforces max throughput defined in configs/constraints.json.
 */

export class Throttle {
  constructor(maxPerSec = 100) {
    this.maxPerSec = maxPerSec;
    this.counts = new Map(); // key → { count, windowStart }
  }

  /**
   * Returns true if the given key is within its rate limit.
   * Call before processing each message.
   */
  allow(key) {
    const now = Date.now();
    let entry = this.counts.get(key);

    if (!entry || now - entry.windowStart >= 1000) {
      entry = { count: 0, windowStart: now };
      this.counts.set(key, entry);
    }

    entry.count++;
    return entry.count <= this.maxPerSec;
  }

  /** Reset all counters */
  reset() {
    this.counts.clear();
  }
}
