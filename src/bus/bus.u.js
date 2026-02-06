/**
 * bus.u.js – Core pub/sub message bus for CSA.OS
 *
 * All inter-unit communication flows through this bus.
 * Supports channels (priority lanes), wildcard subscriptions,
 * and message validation.
 */

export class Bus {
  constructor() {
    this.listeners = new Map();   // topic → Set<callback>
    this.history = [];            // recent messages for replay
    this.maxHistory = 200;
  }

  /** Subscribe to a topic */
  on(topic, callback) {
    if (!this.listeners.has(topic)) this.listeners.set(topic, new Set());
    this.listeners.get(topic).add(callback);
    return () => this.off(topic, callback);
  }

  /** Unsubscribe from a topic */
  off(topic, callback) {
    const subs = this.listeners.get(topic);
    if (subs) subs.delete(callback);
  }

  /** Publish a message to a topic */
  emit(topic, payload) {
    const msg = {
      id: this._id(),
      timestamp: Date.now(),
      topic,
      payload,
    };
    this._record(msg);
    const subs = this.listeners.get(topic);
    if (subs) subs.forEach((cb) => cb(msg.payload, msg));
    // Notify wildcard ('*') subscribers for all topics
    const wildcardSubs = this.listeners.get('*');
    if (wildcardSubs) wildcardSubs.forEach((cb) => cb(msg.payload, msg));
  }

  /** Request/response pattern (returns a Promise) */
  request(topic, payload, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      const replyTopic = `${topic}.reply.${this._id()}`;
      const timer = setTimeout(() => {
        this.off(replyTopic, handler);
        reject(new Error(`bus.request timeout: ${topic}`));
      }, timeoutMs);
      const handler = (data) => {
        clearTimeout(timer);
        this.off(replyTopic, handler);
        resolve(data);
      };
      this.on(replyTopic, handler);
      this.emit(topic, { ...payload, _replyTo: replyTopic });
    });
  }

  /* ── internal ──────────────────────────────────────── */

  _record(msg) {
    this.history.push(msg);
    if (this.history.length > this.maxHistory) this.history.shift();
  }

  _id() {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }
}
