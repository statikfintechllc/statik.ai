/**
 * bridge.u.js – Debug Bridge
 *
 * Streams live system state to an external debugger (e.g. Gemini,
 * a laptop, or another Statik.ai instance watching via WebSocket).
 *
 * Streams: unit states, message flow, performance metrics, errors.
 * Accepts: debug commands (pause unit, inject event, etc.).
 */

export class BridgeUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'bridge.u';
    this.socket = null;
    this.connected = false;
  }

  init() {
    // Auto-detect debug server on local network
    // TODO: probe for ws://192.168.x.x:9000
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** Connect to a debug WebSocket server */
  connect(url) {
    if (typeof WebSocket === 'undefined') return;

    this.socket = new WebSocket(url);
    this.socket.onopen = () => {
      this.connected = true;
      this.bus.emit('bridge.connected', { url });
      this._startStreaming();
    };
    this.socket.onmessage = (e) => this._onCommand(e.data);
    this.socket.onclose = () => {
      this.connected = false;
      this.bus.emit('bridge.disconnected', {});
    };
  }

  /** Send a status snapshot to the debugger */
  sendSnapshot(snapshot) {
    if (!this.connected || !this.socket) return;
    try {
      this.socket.send(JSON.stringify({ type: 'snapshot', data: snapshot }));
    } catch { /* socket may be closing */ }
  }

  _startStreaming() {
    // Forward bus events to the debug server
    this.bus.on('*', (payload, msg) => {
      if (!this.connected) return;
      try {
        this.socket.send(JSON.stringify({ type: 'event', topic: msg?.topic, data: payload }));
      } catch { /* socket may be closing */ }
    });
  }

  _onCommand(rawData) {
    try {
      const cmd = JSON.parse(rawData);
      if (cmd.type === 'debug.command') {
        this.bus.emit('debug.command', cmd);
      }
    } catch { /* ignore malformed commands */ }
  }

  destroy() {
    if (this.socket) this.socket.close();
  }
}
