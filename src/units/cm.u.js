/**
 * cm.u.js – Core Memory
 *
 * Three memory types:
 *   - Episodic  (what happened)
 *   - Semantic  (what things mean)
 *   - Procedural (how to do things)
 *
 * Operations: store, query, forget, consolidate
 * Heavy I/O offloaded to memory.worker.js
 */

import { shortId } from '../utils/id.js';

export class CoreMemoryUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'cm.u';
    this.cache = []; // in-memory recent episodes
    this.maxCache = 100;
  }

  init() {
    this.bus.on('context.temporal', (ctx) => this.store(ctx));
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** Store a context frame as an episodic memory */
  store(context) {
    const record = {
      id: `mem_${shortId()}`,
      timestamp: Date.now(),
      kind: 'episodic',
      content: context,
      salience: context.salience || 0.5,
      tags: context.tokens || [],
    };
    this.cache.push(record);
    if (this.cache.length > this.maxCache) this.cache.shift();
    this._persistRecord(record);
    this.bus.emit('memory.stored', { id: record.id });
    return record;
  }

  /** Query memories by keywords */
  query(keywords, limit = 5) {
    // Simple keyword match on tags
    return this.cache
      .filter((m) => keywords.some((k) => m.tags.includes(k)))
      .sort((a, b) => b.salience - a.salience)
      .slice(0, limit);
  }

  /** Mark a memory as forgotten */
  forget(id) {
    this.cache = this.cache.filter((m) => m.id !== id);
    this._deleteRecord(id);
  }

  /** Persist a record to IndexedDB */
  _persistRecord(record) {
    if (typeof indexedDB === 'undefined') return;
    const req = indexedDB.open('statik_memory', 1);
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction('episodes', 'readwrite');
        tx.objectStore('episodes').put(record);
        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
      } catch (_) { db.close(); }
    };
    req.onerror = () => {};
  }

  /** Remove a record from IndexedDB */
  _deleteRecord(id) {
    if (typeof indexedDB === 'undefined') return;
    const req = indexedDB.open('statik_memory', 1);
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction('episodes', 'readwrite');
        tx.objectStore('episodes').delete(id);
        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
      } catch (_) { db.close(); }
    };
    req.onerror = () => {};
  }

  destroy() {}
}
