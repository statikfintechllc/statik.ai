/**
 * scheduler.js – Task scheduling with priorities and deadlines
 *
 * Manages a priority queue of tasks for the cognitive units.
 * Uses requestIdleCallback when available, falls back to setTimeout.
 */

export class Scheduler {
  constructor() {
    this.queue = [];  // { id, priority, deadline, fn, createdAt }
    this.running = false;
  }

  /** Add a task to the queue */
  schedule(id, fn, { priority = 0, deadlineMs = 5000 } = {}) {
    this.queue.push({
      id,
      priority,
      deadline: Date.now() + deadlineMs,
      fn,
      createdAt: Date.now(),
    });
    this.queue.sort((a, b) => b.priority - a.priority);
    if (!this.running) this._tick();
  }

  /** Cancel a queued task by ID */
  cancel(id) {
    this.queue = this.queue.filter((t) => t.id !== id);
  }

  /* ── internal ──────────────────────────────────────── */

  _tick() {
    if (this.queue.length === 0) { this.running = false; return; }
    this.running = true;

    const task = this.queue.shift();
    const run = () => {
      try { task.fn(); } catch (e) { console.error('[scheduler]', task.id, e); }
      this._tick();
    };

    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(run, { timeout: task.deadline - Date.now() });
    } else {
      setTimeout(run, 0);
    }
  }
}
