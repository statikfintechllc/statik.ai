/**
 * dbt.u.js – Delta & Learning Ledger
 *
 * Logs every state change (delta) as an append-only record.
 * Adjusts pattern confidence based on outcome feedback from ee.u.
 */

export class DeltaLedgerUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'dbt.u';
    this.ledger = [];
    this.patterns = new Map(); // pattern → confidence
  }

  init() {
    this.bus.on('outcome.success', (e) => this.reinforce(e.pattern, +0.05));
    this.bus.on('outcome.failure', (e) => this.reinforce(e.pattern, -0.1));
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** Record a delta (before/after state change) */
  logDelta(type, before, after, evidence) {
    const entry = { timestamp: Date.now(), type, before, after, evidence };
    this.ledger.push(entry);
    this._persistDelta(entry);
    return entry;
  }

  /** Adjust pattern confidence */
  reinforce(patternId, delta) {
    const current = this.patterns.get(patternId) ?? 0.5;
    const updated = Math.max(0, Math.min(1, current + delta));
    this.patterns.set(patternId, updated);

    if (updated < 0.1) {
      this.patterns.delete(patternId);
      this.bus.emit('pattern.pruned', { patternId });
    }
  }

  destroy() {}

  /** Persist a delta entry to IndexedDB */
  _persistDelta(entry) {
    if (typeof indexedDB === 'undefined') return;
    const req = indexedDB.open('statik_logs', 1);
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction('deltas', 'readwrite');
        tx.objectStore('deltas').add(entry);
        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
      } catch (_) { db.close(); }
    };
    req.onerror = () => {};
  }
}
