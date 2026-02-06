/**
 * goals.inspector.js – Goal viewer
 *
 * Displays the current goal stack from gm.u,
 * including priority, status, and source context.
 */

export class GoalsInspector {
  constructor(bus) {
    this.bus = bus;
  }

  mount(container) {
    this.container = container;
    // TODO: subscribe to goal.new events
    // TODO: render goal stack
  }

  refresh() {
    // TODO: re-query gm.u and re-render
  }

  destroy() {}
}
