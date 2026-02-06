import { MDNSDiscovery } from '../adapters/network/mdns.js';
import { ISHAdapter } from '../adapters/server/ish.adapter.js';

export default class DiscoveryUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'disc.u';
        this.mdns = new MDNSDiscovery();
    }

    async onInit() {
        console.log(`${this.id} initialized`);

        // Start discovery
        this.mdns.onPeerFound = (peerInfo) => {
            console.log('Discovery: Peer found', peerInfo);
            this.bus.publish({
                id: `disc_${Date.now()}`,
                type: 'discovery.peer_found',
                source: this.id,
                content: `Found peer: ${peerInfo.id}`,
                payload: { data: peerInfo }
            });

            // Auto-connect mesh on discovery (policy decision)
            this.bus.publish({
                id: `cmd_${Date.now()}`,
                type: 'mesh.connect',
                source: this.id,
                target: 'mesh.u',
                payload: { data: { peerId: peerInfo.id } }
            });
        };

        this.mdns.start();

        // Advertise self
        const myIp = ISHAdapter.getIP();
        this.mdns.advertise({
            id: 'local_instance',
            endpoints: [`http://${myIp}:8080`]
        });
    }
}
