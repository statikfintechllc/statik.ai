import { WebRTCMesh } from '../adapters/network/webrtc.mesh.js';

export default class MeshUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'mesh.u';
        this.mesh = new WebRTCMesh(this.id);
    }

    async onInit() {
        console.log(`${this.id} initialized`);

        // Listen for requests to connect to a peer
        this.bus.subscribe('mesh.connect', async (msg) => {
            const { peerId } = msg.payload.data;
            await this.connectToPeer(peerId);
        });

        // Listen for requests to broadcast data
        this.bus.subscribe('mesh.broadcast', (msg) => {
            this.mesh.broadcast(msg.payload.data);
        });
    }

    async connectToPeer(peerId) {
        try {
            const connected = await this.mesh.connect(peerId);
            if (connected) {
                this.bus.publish({
                    id: `msg_${Date.now()}`,
                    type: 'system.event',
                    source: this.id,
                    content: `Connected to peer: ${peerId}`
                });
            }
        } catch (err) {
            console.error('Mesh connection failed:', err);
        }
    }
}
