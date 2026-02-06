/**
 * disc.u.js – Discovery Unit
 *
 * Finds other Statik.ai instances on the network:
 *   1. Local network – mDNS/Bonjour broadcast
 *   2. Same-origin tabs – BroadcastChannel
 *   3. Remote – WebRTC signaling via public STUN/TURN
 *   4. Decentralised – IPFS pubsub, Nostr relays
 *
 * Emits 'instance.found' when a peer is discovered.
 */

export class DiscoveryUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'disc.u';
    this.peers = new Map(); // instanceId → endpoint info
    this.channel = null;
  }

  init() {
    this._initBroadcastChannel();
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** Announce this instance's presence */
  announce(instanceId, endpoints, capabilities) {
    const payload = {
      type: 'instance.announce',
      payload: {
        instance_id: instanceId,
        transport: ['webrtc', 'websocket', 'local'],
        capabilities: capabilities || ['storage', 'compute'],
        endpoints: endpoints || [],
        timestamp: Date.now(),
      },
    };

    // Broadcast to same-origin tabs
    try {
      if (this.channel) this.channel.postMessage(payload);
    } catch { /* channel may be closed */ }

    // TODO: broadcast via mDNS (requires network adapter)
    // TODO: publish to IPFS / Nostr relays
    this.bus.emit('instance.announced', payload);
  }

  /** Return all known peers */
  listPeers() {
    return [...this.peers.values()];
  }

  _initBroadcastChannel() {
    if (typeof BroadcastChannel === 'undefined') return;
    this.channel = new BroadcastChannel('statik_discovery');
    this.channel.onmessage = (e) => {
      if (e.data?.type === 'instance.announce') {
        const peer = e.data.payload;
        this.peers.set(peer.instance_id, peer);
        this.bus.emit('instance.found', peer);
      }
    };
  }

  destroy() {
    if (this.channel) this.channel.close();
  }
}
