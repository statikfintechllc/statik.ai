/**
 * mDNS Discovery Adapter (Simulation)
 * In a real environment, this might interface with a local server or browser capabilities
 */

export class MDNSDiscovery {
    constructor() {
        this.discovering = false;
    }

    start() {
        this.discovering = true;
        console.log("mDNS: Started discovery scan");
        // Simulate finding a peer after random delay
        setTimeout(() => {
            if (this.onPeerFound) {
                this.onPeerFound({
                    id: 'statik_peer_simulated',
                    name: 'Simulated Peer',
                    endpoints: ['http://localhost:8081']
                });
            }
        }, 5000);
    }

    stop() {
        this.discovering = false;
        console.log("mDNS: Stopped discovery");
    }

    advertise(info) {
        console.log("mDNS: Advertising presence", info);
    }
}
