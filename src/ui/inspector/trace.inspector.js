/**
 * trace.inspector.js – Message flow visualisation
 *
 * Displays the flow of messages through the bus,
 * showing source → target paths and timing.
 */

export class TraceInspector {
  constructor(bus) {
    this.bus = bus;
    this.traces = [];
    this.container = null;
    this._unsub = null;
    this._rafId = null;
    this._renderPending = false;
  }

  mount(container) {
    this.container = container;
    container.innerHTML = `
      <div class="inspector-section">
        <h3>Message Trace</h3>
        <div class="trace-list" style="max-height:300px;overflow-y:auto"></div>
      </div>`;

    /* Tap into bus via wildcard subscriber */
    this._unsub = this.bus.on('*', (payload, msg) => {
      this.capture(msg);
      this._scheduleRender();
    });

    /* Populate initial traces from bus history */
    if (this.bus.history) {
      this.traces = [...this.bus.history];
    }
    this._render();
  }

  /** Capture a trace entry */
  capture(msg) {
    this.traces.push(msg);
    if (this.traces.length > 200) this.traces.shift();
  }

  _render() {
    const list = this.container?.querySelector('.trace-list');
    if (!list) return;
    const recent = this.traces.slice(-30).reverse();
    if (recent.length === 0) {
      list.innerHTML = '<div class="inspector-item" style="color:#666">No messages yet</div>';
      return;
    }
    list.innerHTML = recent.map((t) => `
      <div class="inspector-item">
        <span style="color:var(--accent)">${t.topic || '?'}</span>
        <span style="color:#666;font-size:11px;margin-left:0.5rem">${new Date(t.timestamp).toLocaleTimeString()}</span>
      </div>`).join('');
  }

  /** Batch renders via requestAnimationFrame to avoid per-message reflows */
  _scheduleRender() {
    if (this._renderPending) return;
    this._renderPending = true;
    const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (fn) => setTimeout(fn, 16);
    this._rafId = raf(() => {
      this._renderPending = false;
      this._render();
    });
  }

  destroy() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
    if (this._rafId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this._rafId);
    this._renderPending = false;
    this.traces = [];
    if (this.container) this.container.innerHTML = '';
  }
}
