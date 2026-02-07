/**
 * shell.js – Main UI shell
 *
 * Orchestrates the top-level layout: chat panel, inspector,
 * editor, and system controls. Renders into #shell.
 */

import { Chat } from './chat.js';

export class Shell {
  constructor(bus) {
    this.bus = bus;
    this.container = null;
    this.chat = null;
    this._unsubs = [];
  }

  /** Mount the shell into the DOM */
  mount(el) {
    this.container = el;

    /* Render layout containers */
    el.innerHTML = `
      <header id="shell-header" style="display:flex;justify-content:space-between;align-items:center;padding:0.5rem 1rem;border-bottom:1px solid var(--border);background:var(--surface)">
        <span style="font-weight:600;color:var(--accent)">Statik.ai</span>
        <div style="display:flex;gap:0.5rem">
          <button id="inspector-toggle" title="Inspector">⚙</button>
          <button id="pause-toggle" title="Pause">⏸</button>
        </div>
      </header>
      <div id="chat-container" style="flex:1;display:flex;flex-direction:column;overflow:hidden"></div>
      <div id="inspector" hidden style="border-top:1px solid var(--border);max-height:40vh;overflow-y:auto;background:var(--surface)"></div>
      <footer id="shell-status" style="padding:0.25rem 1rem;font-size:0.75rem;color:#666;border-top:1px solid var(--border)">
        <span id="status-text">Booting…</span>
      </footer>`;

    /* Initialise chat sub-component */
    const chatEl = el.querySelector('#chat-container');
    this.chat = new Chat(this.bus);
    this.chat.mount(chatEl);

    /* Wire controls */
    el.querySelector('#inspector-toggle')?.addEventListener('click', () => this.toggleInspector());
    el.querySelector('#pause-toggle')?.addEventListener('click', () => {
      this.bus.emit('system.pause.toggle', { timestamp: Date.now() });
    });

    /* Listen for status updates */
    this._unsubs.push(this.bus.on('system.ready', () => this._setStatus('Ready')));
    this._unsubs.push(this.bus.on('ui.status', (s) => this._setStatus(s.text || JSON.stringify(s))));

    this.bus.emit('ui.shell.mounted', { timestamp: Date.now() });
  }

  /** Show/hide the inspector panel */
  toggleInspector() {
    const inspector = document.getElementById('inspector');
    if (inspector) inspector.hidden = !inspector.hidden;
  }

  _setStatus(text) {
    const el = this.container?.querySelector('#status-text');
    if (el) el.textContent = text;
  }

  destroy() {
    this._unsubs.forEach((fn) => fn());
    this._unsubs = [];
    if (this.chat) this.chat.destroy();
    if (this.container) this.container.innerHTML = '';
  }
}
