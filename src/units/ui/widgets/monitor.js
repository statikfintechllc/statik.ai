/**
 * Brain Monitor Widget
 * Live cognitive stream + unit state + goal tracking + network status
 */

const UNIT_META = {
    'ec.u':      { name: 'Environment Context',  order: 5 },
    'pce.u':     { name: 'Perception Engine',     order: 10 },
    'as.u':      { name: 'Attention Salience',    order: 20 },
    'ti.u':      { name: 'Temporal Integration',  order: 30 },
    'cm.u':      { name: 'Context Manager',       order: 40 },
    'nlp.u':     { name: 'Language Processing',   order: 50 },
    'gm.u':      { name: 'Goal Manager',          order: 60 },
    'ee.u':      { name: 'Emotional Engine',      order: 70 },
    'dbt.u':     { name: 'Deliberation',          order: 80 },
    'sa.u':      { name: 'Self Awareness',        order: 90 },
    'ie.u':      { name: 'Intent Execution',      order: 100 },
    'hc.u':      { name: 'Health Check',          order: 110 },
    'ui.u':      { name: 'UI Controller',         order: 120 },
    'bridge.u':  { name: 'Debug Bridge',          order: 125 },
    'mesh.u':    { name: 'Mesh Network',          order: 130 },
    'disc.u':    { name: 'Discovery',             order: 135 },
    'dev.u':     { name: 'Developer Tools',       order: 140 },
    'deploy.u':  { name: 'Deployment',            order: 150 },
    'dns.u':     { name: 'DNS Service',           order: 160 }
};

const MAX_STREAM = 300;

export default class MonitorWidget {
    constructor(container, bus) {
        this.container = container;
        this.bus = bus;
        this.stream = [];
        this.goals = new Map();
        this.unitActivity = {};
        this.activeTab = 'stream';
        this._startTime = Date.now();
        this._dirty = false;
        this._autoScroll = true;

        // Init unit tracking
        Object.keys(UNIT_META).forEach(id => {
            this.unitActivity[id] = { lastSeen: 0, msgCount: 0, errors: 0 };
        });

        this.render();
        this.subscribe();
    }

    render() {
        this.container.style.cssText = `
            display: flex; flex-direction: column; height: 100%;
            background: rgba(0,0,0,0.2);
        `;

        // Tab bar
        this.tabBar = document.createElement('div');
        this.tabBar.className = 'monitor-tabs';

        const tabs = [
            { id: 'stream',  label: '\u26A1 Stream' },
            { id: 'units',   label: '\uD83D\uDD27 Units' },
            { id: 'goals',   label: '\uD83C\uDFAF Goals' },
            { id: 'network', label: '\uD83C\uDF10 Net' }
        ];

        tabs.forEach(tab => {
            const el = document.createElement('div');
            el.className = `monitor-tab${tab.id === this.activeTab ? ' active' : ''}`;
            el.textContent = tab.label;
            el.dataset.tab = tab.id;
            el.onclick = () => this.switchTab(tab.id);
            this.tabBar.appendChild(el);
        });

        // Body
        this.body = document.createElement('div');
        this.body.className = 'monitor-body';

        // Detect user scroll to pause auto-scroll
        this.body.addEventListener('scroll', () => {
            const atBottom = this.body.scrollHeight - this.body.scrollTop - this.body.clientHeight < 40;
            this._autoScroll = atBottom;
        });

        // Status bar
        this.statusBar = document.createElement('div');
        this.statusBar.className = 'monitor-status';
        this.statusBar.textContent = 'Initializing...';

        this.container.appendChild(this.tabBar);
        this.container.appendChild(this.body);
        this.container.appendChild(this.statusBar);

        this.renderTab();
    }

    subscribe() {
        this.bus.subscribe('*', (msg) => {
            // Skip our own events
            if (msg.source === 'monitor') return;

            // Track stream
            this.stream.push({
                time: Date.now(),
                type: msg.type,
                source: msg.source || '?',
                content: msg.content || ''
            });
            if (this.stream.length > MAX_STREAM) this.stream.shift();

            // Track units
            if (msg.source) {
                if (!this.unitActivity[msg.source]) {
                    this.unitActivity[msg.source] = { lastSeen: 0, msgCount: 0, errors: 0 };
                }
                this.unitActivity[msg.source].lastSeen = Date.now();
                this.unitActivity[msg.source].msgCount++;
            }

            // Track goals
            if (msg.type === 'goal.new' && msg.payload?.goal) {
                this.goals.set(msg.payload.goal.id, {
                    status: 'pending',
                    goal: msg.payload.goal,
                    created: Date.now()
                });
            } else if (msg.type === 'goal.execute') {
                for (const [, g] of this.goals) {
                    if (g.status === 'pending') {
                        g.status = 'executing';
                        g.executedAt = Date.now();
                        break;
                    }
                }
            } else if (msg.type === 'ui.output') {
                for (const [, g] of this.goals) {
                    if (g.status === 'executing') {
                        g.status = 'done';
                        g.doneAt = Date.now();
                        break;
                    }
                }
            }

            // Track errors
            if (msg.type?.includes('error') && msg.source) {
                if (this.unitActivity[msg.source]) {
                    this.unitActivity[msg.source].errors++;
                }
            }

            // Throttled render via rAF
            if (!this._dirty) {
                this._dirty = true;
                requestAnimationFrame(() => {
                    this._dirty = false;
                    this.refreshActiveTab();
                });
            }
        });
    }

    switchTab(tab) {
        this.activeTab = tab;
        this.tabBar.querySelectorAll('.monitor-tab').forEach(el => {
            el.classList.toggle('active', el.dataset.tab === tab);
        });
        this.body.innerHTML = '';
        this._lastStreamLen = 0;
        this.renderTab();
    }

    renderTab() {
        switch (this.activeTab) {
            case 'stream':  this.renderStream(); break;
            case 'units':   this.renderUnits(); break;
            case 'goals':   this.renderGoals(); break;
            case 'network': this.renderNetwork(); break;
        }
        this.updateStatusBar();
    }

    refreshActiveTab() {
        if (this.activeTab === 'stream') {
            this.appendNewStreamEntries();
        } else {
            this.body.innerHTML = '';
            this.renderTab();
        }
        this.updateStatusBar();
    }

    // ── Stream Tab ─────────────────────────────────────────────

    renderStream() {
        this.body.innerHTML = '';
        this._lastStreamLen = 0;

        if (this.stream.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'monitor-empty';
            empty.textContent = 'Waiting for bus events...';
            this.body.appendChild(empty);
            return;
        }

        // Show last 80 entries
        const visible = this.stream.slice(-80);
        const frag = document.createDocumentFragment();
        visible.forEach(entry => frag.appendChild(this.createStreamEntry(entry)));
        this.body.appendChild(frag);
        this._lastStreamLen = this.stream.length;

        if (this._autoScroll) {
            this.body.scrollTop = this.body.scrollHeight;
        }
    }

    appendNewStreamEntries() {
        if (this._lastStreamLen === undefined) this._lastStreamLen = 0;

        // Remove "waiting" placeholder
        const empty = this.body.querySelector('.monitor-empty');
        if (empty) empty.remove();

        const newEntries = this.stream.slice(this._lastStreamLen);
        this._lastStreamLen = this.stream.length;

        if (newEntries.length === 0) return;

        const frag = document.createDocumentFragment();
        newEntries.forEach(entry => frag.appendChild(this.createStreamEntry(entry)));
        this.body.appendChild(frag);

        // Trim DOM nodes if too many
        while (this.body.children.length > 120) {
            this.body.removeChild(this.body.firstChild);
        }

        if (this._autoScroll) {
            this.body.scrollTop = this.body.scrollHeight;
        }
    }

    createStreamEntry(entry) {
        const el = document.createElement('div');
        el.className = 'monitor-entry';

        const d = new Date(entry.time);
        const time = `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}.${d.getMilliseconds().toString().padStart(3,'0')}`;
        const color = this.getTypeColor(entry.type);

        el.innerHTML = `
            <span class="entry-time">${time}</span>
            <span class="entry-type" style="color:${color}">${entry.type}</span>
            <span class="entry-source">[${entry.source}]</span>
            <span class="entry-content">${this.esc(this.truncate(entry.content, 50))}</span>
        `;
        return el;
    }

    // ── Units Tab ──────────────────────────────────────────────

    renderUnits() {
        const sorted = Object.entries(UNIT_META).sort((a, b) => a[1].order - b[1].order);
        const frag = document.createDocumentFragment();

        sorted.forEach(([id, meta]) => {
            const act = this.unitActivity[id] || { lastSeen: 0, msgCount: 0, errors: 0 };
            const now = Date.now();
            const everSeen = act.lastSeen > 0;
            const isActive = everSeen && (now - act.lastSeen) < 30000;
            const statusClass = everSeen ? (isActive ? 'active' : 'idle') : 'offline';

            const el = document.createElement('div');
            el.className = 'monitor-unit';
            el.innerHTML = `
                <span class="unit-dot ${statusClass}">\u25CF</span>
                <span class="unit-id">${id}</span>
                <span class="unit-name">${meta.name}</span>
                <span class="unit-count">${act.msgCount}${act.errors ? ` <span style="color:var(--neon-red)">\u2716${act.errors}</span>` : ''}</span>
            `;
            frag.appendChild(el);
        });

        this.body.appendChild(frag);
    }

    // ── Goals Tab ──────────────────────────────────────────────

    renderGoals() {
        const goals = [...this.goals.values()].reverse().slice(0, 30);

        if (goals.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'monitor-empty';
            empty.textContent = 'No goals yet. Type in the terminal to trigger cognitive flow.';
            this.body.appendChild(empty);
            return;
        }

        const frag = document.createDocumentFragment();
        goals.forEach(g => {
            const el = document.createElement('div');
            el.className = `monitor-goal ${g.status}`;

            const icon = g.status === 'pending' ? '\u23F3' : g.status === 'executing' ? '\u26A1' : '\u2705';
            const elapsed = g.doneAt
                ? `${g.doneAt - g.created}ms`
                : g.executedAt
                    ? `${Date.now() - g.created}ms\u2026`
                    : '';

            el.innerHTML = `
                <span class="goal-icon">${icon}</span>
                <span class="goal-type">${g.goal.type || 'unknown'}</span>
                <span class="goal-input">${this.esc(this.truncate(g.goal.params?.input || '', 35))}</span>
                <span class="goal-elapsed">${elapsed}</span>
            `;
            frag.appendChild(el);
        });

        this.body.appendChild(frag);
    }

    // ── Network Tab ────────────────────────────────────────────

    renderNetwork() {
        const el = document.createElement('div');
        el.className = 'monitor-network';

        const activeUnits = Object.values(this.unitActivity).filter(u => Date.now() - u.lastSeen < 30000).length;
        const totalUnits = Object.keys(UNIT_META).length;
        const uptime = Math.round((Date.now() - this._startTime) / 1000);
        const mins = Math.floor(uptime / 60);
        const secs = uptime % 60;

        const rows = [
            { label: 'Bus Events',     value: String(this.stream.length) },
            { label: 'Active Units',   value: `${activeUnits} / ${totalUnits}` },
            { label: 'Goals Processed', value: String(this.goals.size) },
            { label: 'Monitor Uptime', value: `${mins}m ${secs}s` },
        ];

        rows.forEach(r => {
            const row = document.createElement('div');
            row.className = 'net-row';
            row.innerHTML = `<span class="net-label">${r.label}</span><span class="net-value">${r.value}</span>`;
            el.appendChild(row);
        });

        // Server peers (async)
        const peersRow = document.createElement('div');
        peersRow.className = 'net-row';
        peersRow.innerHTML = `<span class="net-label">Server Peers</span><span class="net-value net-peers-val">Loading\u2026</span>`;
        el.appendChild(peersRow);

        this.body.appendChild(el);

        fetch('/debug/peers')
            .then(r => r.json())
            .then(data => {
                const v = peersRow.querySelector('.net-peers-val');
                if (v) v.textContent = data.peers?.length ? data.peers.join(', ') : 'None';
            })
            .catch(() => {
                const v = peersRow.querySelector('.net-peers-val');
                if (v) v.textContent = 'Offline';
            });
    }

    // ── Helpers ────────────────────────────────────────────────

    updateStatusBar() {
        const active = Object.values(this.unitActivity).filter(u => Date.now() - u.lastSeen < 30000).length;
        this.statusBar.textContent = `\u25C8 Events: ${this.stream.length}  |  Units: ${active}/${Object.keys(UNIT_META).length}  |  Goals: ${this.goals.size}`;
    }

    getTypeColor(type) {
        if (!type) return 'rgba(255,255,255,0.4)';
        if (type.startsWith('context.')) return '#bc13fe';
        if (type.startsWith('goal.'))    return '#0aff0a';
        if (type.startsWith('ui.'))      return '#00f3ff';
        if (type.startsWith('mesh.'))    return '#ff8c00';
        if (type.startsWith('bridge.'))  return '#ffd700';
        if (type.startsWith('dev.'))     return '#87ceeb';
        if (type.startsWith('disc.'))    return '#ff69b4';
        return 'rgba(255,255,255,0.5)';
    }

    truncate(str, max) {
        if (!str) return '';
        return str.length > max ? str.slice(0, max) + '\u2026' : str;
    }

    esc(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
}
