/**
 * ui.u.js – User Interface Unit
 *
 * Components: chat window, memory inspector, goal viewer,
 *             action log, system controls.
 *
 * Principle: full transparency – user sees what the system
 * is thinking, remembering, and doing.
 */

export class UIUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'ui.u';
  }

  init() {
    this.bus.on('system.ready', () => this._renderShell());
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** Render a message in the chat window */
  showMessage(text, sender = 'system') {
    // TODO: delegate to src/ui/chat.js
    this.bus.emit('ui.message', { text, sender, timestamp: Date.now() });
  }

  /** Update system status in the UI */
  updateStatus(status) {
    // TODO: delegate to src/ui/shell.js
    this.bus.emit('ui.status', status);
  }

  _renderShell() {
    // TODO: initialise shell.js, chat.js, inspector
  }

  destroy() {}
}
