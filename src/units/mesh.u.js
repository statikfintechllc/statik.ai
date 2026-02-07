import { WebRTCMesh } from '../adapters/network/webrtc.mesh.js';

export default class MeshUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'mesh.u';
        this.mesh = new WebRTCMesh(this.id);
    }

    async onInit() {
        console.log(`${this.id} initialized`);

        // Wire up mesh callbacks
        this.mesh.onPeerConnected = (peerId) => {
            console.log(`Mesh: Peer connected: ${peerId}`);
            this.bus.publish({
                id: `mesh_conn_${Date.now()}`,
                type: 'mesh.connected',
                source: this.id,
                timestamp: Date.now(),
                content: `Connected to peer: ${peerId}`,
                payload: { peerId }
            });
        };

        this.mesh.onPeerDisconnected = (peerId) => {
            console.log(`Mesh: Peer disconnected: ${peerId}`);
            this.bus.publish({
                id: `mesh_disc_${Date.now()}`,
                type: 'mesh.disconnected',
                source: this.id,
                timestamp: Date.now(),
                content: `Disconnected from peer: ${peerId}`,
                payload: { peerId }
            });
        };

        this.mesh.onMessage = (peerId, data) => {
            console.log(`Mesh: Message from ${peerId}:`, data);
            this.bus.publish({
                id: `mesh_msg_${Date.now()}`,
                type: 'mesh.message',
                source: this.id,
                timestamp: Date.now(),
                content: `Message from ${peerId}`,
                payload: { peerId, data }
            });
        };

        // Wire signaling through bridge unit's WebSocket
        this.mesh.sendSignal = (data) => {
            this.bus.publish({
                id: `sig_out_${Date.now()}`,
                type: 'bridge.send-signal',
                source: this.id,
                timestamp: Date.now(),
                content: `Signal: ${data.type}`,
                payload: data
            });
        };

        // Listen for signaling messages from bridge
        this.bus.subscribe('mesh.signal.offer', async (msg) => {
            const { signal } = msg.payload;
            await this.mesh.handleOffer(signal.source, signal.sdp);
        });

        this.bus.subscribe('mesh.signal.answer', async (msg) => {
            const { signal } = msg.payload;
            await this.mesh.handleAnswer(signal.source, signal.sdp);
        });

        this.bus.subscribe('mesh.signal.ice-candidate', async (msg) => {
            const { signal } = msg.payload;
            await this.mesh.handleIceCandidate(signal.source, signal.candidate);
        });

        // Listen for peer availability from bridge/discovery
        this.bus.subscribe('mesh.peer-available', async (msg) => {
            const { peerId } = msg.payload;
            if (!this.mesh.peers.has(peerId)) {
                await this.mesh.connect(peerId);
            }
        });

        // Listen for explicit connect commands
        this.bus.subscribe('mesh.connect', async (msg) => {
            const peerId = msg.payload?.data?.peerId || msg.payload?.peerId;
            if (peerId) {
                await this.connectToPeer(peerId);
            }
        });

        // Listen for broadcast commands
        this.bus.subscribe('mesh.broadcast', (msg) => {
            this.mesh.broadcast(msg.payload?.data || msg.payload);
        });

        // Listen for peer-left
        this.bus.subscribe('mesh.peer-left', (msg) => {
            const { peerId } = msg.payload;
            this.mesh.disconnect(peerId);
        });
    }

    async connectToPeer(peerId) {
        try {
            const connected = await this.mesh.connect(peerId);
            if (connected) {
                console.log(`Mesh: Initiated connection to ${peerId}`);
            }
        } catch (err) {
            console.error('Mesh: Connection failed:', err);
        }
    }
}
