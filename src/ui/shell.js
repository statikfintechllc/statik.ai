/**
 * shell.js – Main UI shell
 *
 * Orchestrates the top-level layout: chat panel, inspector,
 * editor, and system controls. Renders into #shell.
 */

export class Shell {
  constructor(bus) {
    this.bus = bus;
    this.container = null;
  }

  /** Mount the shell into the DOM */
  mount(el) {
    this.container = el;
    // TODO: render layout containers
    // TODO: initialise sub-components (chat, inspector, controls)
    this.bus.emit('ui.shell.mounted', { timestamp: Date.now() });
  }

  /** Show/hide the inspector panel */
  toggleInspector() {
    const inspector = document.getElementById('inspector');
    if (inspector) inspector.hidden = !inspector.hidden;
  }

  destroy() {
    if (this.container) this.container.innerHTML = '';
  }
}
