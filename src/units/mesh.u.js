/**
 * mesh.u.js – P2P Mesh Networking
 *
 * Establishes WebRTC connections between Statik.ai instances.
 *
 * Capabilities:
 *   - Sync memories across devices
 *   - Distribute goals (delegate tasks)
 *   - Federated compute (offload heavy work)
 *   - Backup (replicate state across instances)
 */

export class MeshUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'mesh.u';
    this.connections = new Map(); // peerId → RTCPeerConnection
  }

  init() {
    this.bus.on('instance.found', (peer) => this._onPeerDiscovered(peer));
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** Connect to a discovered peer via WebRTC */
  async connect(peerId, signalingData) {
    if (typeof RTCPeerConnection === 'undefined') return null;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    const dataChannel = pc.createDataChannel('statik_mesh');
    dataChannel.onmessage = (e) => this._onMessage(peerId, e.data);

    this.connections.set(peerId, { pc, dataChannel });

    // TODO: exchange SDP offers/answers via signaling channel
    return pc;
  }

  /** Send data to a connected peer */
  send(peerId, data) {
    const conn = this.connections.get(peerId);
    if (!conn?.dataChannel || conn.dataChannel.readyState !== 'open') return false;
    try {
      conn.dataChannel.send(JSON.stringify(data));
    } catch { return false; }
    return true;
  }

  /** Broadcast data to all connected peers */
  broadcast(data) {
    for (const [peerId] of this.connections) {
      this.send(peerId, data);
    }
  }

  _onPeerDiscovered(peer) {
    // TODO: initiate WebRTC connection to peer
    this.bus.emit('mesh.peer.discovered', { peerId: peer.instance_id });
  }

  _onMessage(peerId, rawData) {
    try {
      const data = JSON.parse(rawData);
      this.bus.emit('mesh.message', { peerId, data });
    } catch { /* ignore malformed messages */ }
  }

  destroy() {
    for (const [, conn] of this.connections) {
      conn.pc.close();
    }
    this.connections.clear();
  }
}
