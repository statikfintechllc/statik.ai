/**
 * Discovery Unit
 * Uses WebSocket signaling server for real peer discovery
 * Falls back to BroadcastChannel for same-origin tab sync
 */

export default class DiscoveryUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'disc.u';
        this.knownPeers = new Set();
        this.broadcastChannel = null;
    }

    async onInit() {
        console.log(`${this.id} initialized`);

        // 1. Same-origin tab discovery via BroadcastChannel
        this.setupBroadcastChannel();

        // 2. Listen for peers from bridge (WebSocket signaling)
        this.bus.subscribe('mesh.peer-available', (msg) => {
            const { peerId } = msg.payload;
            if (!this.knownPeers.has(peerId)) {
                this.knownPeers.add(peerId);
                console.log(`Discovery: New peer discovered: ${peerId}`);
                this.bus.publish({
                    id: `disc_${Date.now()}`,
                    type: 'discovery.peer_found',
                    source: this.id,
                    timestamp: Date.now(),
                    content: `Found peer: ${peerId}`,
                    payload: { data: { id: peerId, source: 'signaling' } }
                });
            }
        });

        this.bus.subscribe('mesh.peer-left', (msg) => {
            const { peerId } = msg.payload;
            this.knownPeers.delete(peerId);
            console.log(`Discovery: Peer left: ${peerId}`);
        });

        // 3. Advertise self
        console.log(`Discovery: Instance ready for peer connections`);
    }

    setupBroadcastChannel() {
        try {
            this.broadcastChannel = new BroadcastChannel('statik-ai-discovery');

            this.broadcastChannel.onmessage = (event) => {
                const msg = event.data;
                if (msg.type === 'announce' && !this.knownPeers.has(msg.peerId)) {
                    this.knownPeers.add(msg.peerId);
                    console.log(`Discovery: Same-origin peer found: ${msg.peerId}`);
                    this.bus.publish({
                        id: `disc_bc_${Date.now()}`,
                        type: 'discovery.peer_found',
                        source: this.id,
                        timestamp: Date.now(),
                        content: `Found same-origin peer: ${msg.peerId}`,
                        payload: { data: { id: msg.peerId, source: 'broadcast-channel' } }
                    });
                }
            };

            // Announce self
            this.broadcastChannel.postMessage({
                type: 'announce',
                peerId: `tab_${Date.now().toString(36)}`
            });
        } catch (e) {
            console.log('Discovery: BroadcastChannel not available');
        }
    }
}
