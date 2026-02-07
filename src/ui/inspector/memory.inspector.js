/**
 * memory.inspector.js – Memory viewer
 *
 * Displays stored episodic, semantic, and procedural memories.
 * Allows searching, filtering, and manual deletion.
 */

export class MemoryInspector {
  constructor(bus) {
    this.bus = bus;
    this.container = null;
    this.memories = [];
    this._unsub = null;
  }

  /** Render memory list into a container */
  mount(container) {
    this.container = container;
    container.innerHTML = `
      <div class="inspector-section">
        <h3>Memory</h3>
        <input type="text" class="memory-search" placeholder="Search memories…" style="width:100%;margin-bottom:0.5rem" />
        <div class="memory-list"></div>
      </div>`;

    const searchInput = container.querySelector('.memory-search');
    searchInput?.addEventListener('input', (e) => this._filter(e.target.value));

    this._unsub = this.bus.on('memory.stored', () => this.refresh());
    this.refresh();
  }

  /** Refresh the memory view */
  async refresh() {
    if (typeof this.bus.request === 'function') {
      try {
        const result = await this.bus.request('memory.query', { keywords: [], limit: 50 }, 2000);
        const memories = Array.isArray(result)
          ? result
          : (result && Array.isArray(result.memories) ? result.memories : []);
        this.update(memories);
        return;
      } catch (_) { /* fall through to render current data */ }
    }
    this._render(this.memories);
  }

  /** Update with new data */
  update(memories) {
    this.memories = memories;
    this._render(memories);
  }

  _filter(term) {
    if (!term) return this._render(this.memories);
    const lower = term.toLowerCase();
    const filtered = this.memories.filter((m) =>
      m.tags?.some((t) => t.includes(lower)) || m.id?.includes(lower)
    );
    this._render(filtered);
  }

  _render(items) {
    const list = this.container?.querySelector('.memory-list');
    if (!list) return;
    if (!items || items.length === 0) {
      list.innerHTML = '<div class="inspector-item" style="color:#666">No memories stored</div>';
      return;
    }
    list.innerHTML = items.map((m) => `
      <div class="inspector-item">
        <div style="color:var(--accent);font-size:11px">${m.id || '?'}</div>
        <div>${(m.tags || []).join(', ') || '—'}</div>
        <div style="color:#666;font-size:11px">${m.kind || ''} · salience: ${m.salience ?? '?'}</div>
      </div>`).join('');
  }

  destroy() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
    if (this.container) this.container.innerHTML = '';
  }
}
