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

        // Connect immediately
        this.connect();

        // Subscribe to all system events to stream them
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
        console.log("Bridge: Connecting to Live Log Server...");
        this.connected = true;
    }

    sendToDebugger(data) {
        if (!this.connected) return;

        // Use simple fetch POST to send logs to our python server
        fetch('/log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: data.type,
                message: data.payload.content || 'Event',
                payload: data.payload
            })
        }).catch(err => {
            // console.error("Bridge send failed", err);
        });
    }
}
