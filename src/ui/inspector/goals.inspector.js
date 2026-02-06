/**
 * goals.inspector.js – Goal viewer
 *
 * Displays the current goal stack from gm.u,
 * including priority, status, and source context.
 */

export class GoalsInspector {
  constructor(bus) {
    this.bus = bus;
    this.goals = [];
    this.container = null;
  }

  mount(container) {
    this.container = container;
    container.innerHTML = `
      <div class="inspector-section">
        <h3>Goals</h3>
        <div class="goals-list"></div>
      </div>`;

    this.bus.on('goal.new', (goal) => {
      this.goals.push(goal);
      if (this.goals.length > 50) this.goals.shift();
      this._render();
    });

    this.bus.on('action.completed', (result) => {
      const g = this.goals.find((g) => g.id === result.id);
      if (g) g.status = result.outcome?.error ? 'failed' : 'done';
      this._render();
    });

    this._render();
  }

  refresh() {
    this._render();
  }

  _render() {
    const list = this.container?.querySelector('.goals-list');
    if (!list) return;
    if (this.goals.length === 0) {
      list.innerHTML = '<div class="inspector-item" style="color:#666">No goals yet</div>';
      return;
    }
    list.innerHTML = [...this.goals].reverse().map((g) => `
      <div class="inspector-item">
        <div style="color:var(--accent);font-size:11px">${g.id || '?'} · ${g.status || 'active'}</div>
        <div>${g.intent || g.text || '—'}</div>
        <div style="color:#666;font-size:11px">priority: ${g.priority ?? '?'}</div>
      </div>`).join('');
  }

  destroy() {
    this.goals = [];
    if (this.container) this.container.innerHTML = '';
  }
}
