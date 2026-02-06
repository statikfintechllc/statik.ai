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
  }

  mount(container) {
    this.container = container;
    // TODO: tap into bus history for recent messages
    // TODO: render timeline / flow diagram
  }

  /** Capture a trace entry */
  capture(msg) {
    this.traces.push(msg);
    if (this.traces.length > 200) this.traces.shift();
  }

  destroy() {
    this.traces = [];
  }
}
