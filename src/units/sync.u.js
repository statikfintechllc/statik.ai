/**
 * sync.u.js – Sync & Federation (Optional)
 *
 * Mechanisms:
 *   - BroadcastChannel (same-origin tabs)
 *   - WebRTC (peer-to-peer, future)
 *   - Export/Import JSON snapshots
 *
 * All sync is opt-in – no automatic external connections.
 */

export class SyncUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'sync.u';
    this.channel = null;
  }

  init() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('statik_sync');
      this.channel.onmessage = (e) => this._onRemote(e.data);
    }
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** Broadcast a state snapshot to other tabs */
  broadcast(data) {
    if (this.channel) this.channel.postMessage(data);
  }

  /** Export system state as JSON */
  exportState() {
    const state = { timestamp: Date.now(), units: {} };
    /* Collect state snapshots from any unit that replied */
    this.bus.emit('state.export.request', {});
    return state;
  }

  /** Import state from JSON */
  importState(json) {
    if (json && json.units) {
      this.bus.emit('state.import', json);
    }
    this.bus.emit('sync.imported', { timestamp: Date.now() });
  }

  _onRemote(data) {
    this.bus.emit('sync.remote', data);
  }

  destroy() {
    if (this.channel) this.channel.close();
  }
}
