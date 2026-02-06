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

        // Start polling for remote commands
        this.pollForCommands();

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

    pollForCommands() {
        setInterval(() => {
            fetch('/cmd')
                .then(res => res.json())
                .then(data => {
                    if (data.command) {
                        console.log("Bridge: Received command", data.command);
                        this.handleCommand(data.command);
                    }
                })
                .catch(e => {
                    // silent fail on poll error
                });
        }, 2000); // Poll every 2 seconds
    }

    handleCommand(cmd) {
        if (cmd === 'reload') {
            console.log("Bridge: Executing Remote Reload...");
            window.location.reload();
        }
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
