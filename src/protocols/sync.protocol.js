/**
 * sync.protocol.js – State Sync Between Instances
 *
 * Synchronises state between connected Statik.ai instances:
 *   - Memory sync (share learned patterns)
 *   - Config sync (propagate settings)
 *   - Selective sync (user controls what syncs)
 *
 * Uses vector clocks for conflict resolution.
 */

export class SyncProtocol {
  constructor(bus) {
    this.bus = bus;
    this.vectorClock = new Map(); // instanceId → counter
  }

  /** Increment the local vector clock */
  tick(instanceId) {
    const current = this.vectorClock.get(instanceId) || 0;
    this.vectorClock.set(instanceId, current + 1);
    return current + 1;
  }

  /** Create a sync request message */
  createSyncRequest(instanceId, scope = 'full') {
    return {
      type: 'sync.request',
      payload: {
        instance_id: instanceId,
        scope, // 'full' | 'memory' | 'config' | 'selective'
        clock: Object.fromEntries(this.vectorClock),
        timestamp: Date.now(),
      },
    };
  }

  /** Create a sync response with delta */
  createSyncResponse(instanceId, delta) {
    return {
      type: 'sync.response',
      payload: {
        instance_id: instanceId,
        delta,
        clock: Object.fromEntries(this.vectorClock),
        timestamp: Date.now(),
      },
    };
  }

  /** Compare two vector clocks to determine ordering */
  compare(clockA, clockB) {
    let aLater = false, bLater = false;
    const allKeys = new Set([...Object.keys(clockA), ...Object.keys(clockB)]);
    for (const key of allKeys) {
      const a = clockA[key] || 0;
      const b = clockB[key] || 0;
      if (a > b) aLater = true;
      if (b > a) bLater = true;
    }
    if (aLater && !bLater) return 'a_later';
    if (bLater && !aLater) return 'b_later';
    if (aLater && bLater) return 'concurrent';
    return 'equal';
  }
}
