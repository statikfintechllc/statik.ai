/**
 * performance.inspector.js – Performance dashboard
 *
 * Shows real-time metrics: CPU time per unit,
 * message throughput, memory usage, error rates.
 */

export class PerformanceInspector {
  constructor(bus) {
    this.bus = bus;
    this.container = null;
    this.metrics = {};
  }

  mount(container) {
    this.container = container;
    container.innerHTML = `
      <div class="inspector-section">
        <h3>Performance</h3>
        <div class="perf-metrics"></div>
      </div>`;

    this.bus.on('telemetry.snapshot', (data) => {
      this.metrics = data;
      this._render();
    });

    this._render();
  }

  refresh() {
    this.bus.emit('telemetry.request', { timestamp: Date.now() });
    this._render();
  }

  _render() {
    const el = this.container?.querySelector('.perf-metrics');
    if (!el) return;

    const entries = [
      { label: 'Messages/s', value: this.metrics.msgPerSec ?? '—' },
      { label: 'Units active', value: this.metrics.unitsActive ?? '—' },
      { label: 'Memory (MB)', value: this.metrics.memoryMB ?? '—' },
      { label: 'Errors', value: this.metrics.errorCount ?? 0 },
    ];

    el.innerHTML = entries.map((e) => `
      <div class="inspector-metric">
        <span class="label">${e.label}</span>
        <span class="value">${e.value}</span>
      </div>`).join('');
  }

  destroy() {
    if (this.container) this.container.innerHTML = '';
  }
}
