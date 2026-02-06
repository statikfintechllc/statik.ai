export default class BridgeUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'bridge.u';
        this.socket = null;
        this.connected = false;
        this.debugServerUrl = 'ws://localhost:9000'; // Default, configurable
    }

    async onInit() {
        console.log(`${this.id} initialized`);

        // Attempt to connect to debug server
        this.connect();

        // Subscribe to all system events to stream them
        // Note: In a real app we might filter high volume events
        this.bus.subscribe('*', (msg) => {
            if (this.connected) {
                this.sendToDebugger({
                    type: 'log',
                    payload: msg
                });
            }
        });
    }

    connect() {
        // Simple WebSocket connection stub for now
        if ('WebSocket' in window) {
            try {
                // We won't actually auto-connect in this demo to avoid console errors if server is missing
                // this.socket = new WebSocket(this.debugServerUrl);
                // this.socket.onopen = () => { ... }
                console.log("Bridge: WebSocket capability detected. Waiting for user to trigger connection.");
            } catch (e) {
                console.error("Bridge connection failed", e);
            }
        }
    }

    sendToDebugger(data) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        }
    }
}
