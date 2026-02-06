/**
 * memory.inspector.js – Memory viewer
 *
 * Displays stored episodic, semantic, and procedural memories.
 * Allows searching, filtering, and manual deletion.
 */

export class MemoryInspector {
  constructor(bus) {
    this.bus = bus;
  }

  /** Render memory list into a container */
  mount(container) {
    this.container = container;
    // TODO: query cm.u for current memories
    // TODO: render searchable list
  }

  /** Refresh the memory view */
  refresh() {
    // TODO: re-query and re-render
  }

  destroy() {}
}
