/**
 * performance.inspector.js – Performance dashboard
 *
 * Shows real-time metrics: CPU time per unit,
 * message throughput, memory usage, error rates.
 */

export class PerformanceInspector {
  constructor(bus) {
    this.bus = bus;
  }

  mount(container) {
    this.container = container;
    // TODO: subscribe to telemetry.u metrics
    // TODO: render charts / gauges
  }

  refresh() {
    // TODO: re-query telemetry.u and re-render
  }

  destroy() {}
}
