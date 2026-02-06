/**
 * ui.u.js – User Interface Unit
 *
 * Components: chat window, memory inspector, goal viewer,
 *             action log, system controls.
 *
 * Principle: full transparency – user sees what the system
 * is thinking, remembering, and doing.
 */

import { Shell } from '../ui/shell.js';

export class UIUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'ui.u';
    this.shell = null;
  }

  init() {
    this.bus.on('system.ready', () => this._renderShell());
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** Render a message in the chat window */
  showMessage(text, sender = 'system') {
    this.bus.emit('ui.message', { text, sender, timestamp: Date.now() });
  }

  /** Update system status in the UI */
  updateStatus(status) {
    this.bus.emit('ui.status', status);
  }

  _renderShell() {
    if (typeof document === 'undefined') return;
    const shellEl = document.getElementById('shell');
    if (!shellEl) return;

    this.shell = new Shell(this.bus);
    this.shell.mount(shellEl);
  }

  destroy() {
    if (this.shell) this.shell.destroy();
  }
}
