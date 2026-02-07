export default class BridgeUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'bridge.u';
        this.ws = null;
        this.connected = false;
        this.peerId = `statik_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 4)}`;
        this.reconnectTimer = null;
        this.httpFallback = true;  // fallback to HTTP POST /log
    }

    async onInit() {
        console.log(`${this.id} initialized`);

        // Try WebSocket first, fallback to HTTP polling
        this.connectWebSocket();

        // Also keep HTTP polling for commands (reliable fallback)
        this.pollForCommands();

        // Stream all bus events to debug server
        this.bus.subscribe('*', (msg) => {
            this.sendLog('bus-event', msg.type || 'unknown', msg);
        });

        // Forward WebRTC signaling from mesh to WebSocket
        this.bus.subscribe('bridge.send-signal', (msg) => {
            this.sendSignal(msg.payload);
        });

        // Intercept global errors
        window.addEventListener('error', (e) => {
            this.sendLog('error', e.message, {
                filename: e.filename, lineno: e.lineno,
                colno: e.colno, stack: e.error?.stack
            });
        });

        window.addEventListener('unhandledrejection', (e) => {
            this.sendLog('error', 'Unhandled Promise Rejection', {
                reason: String(e.reason), stack: e.reason?.stack
            });
        });
    }

    connectWebSocket() {
        try {
            const hostname = window.location.hostname || 'localhost';
            const protocol = (window.location && window.location.protocol === 'https:') ? 'wss' : 'ws';
            const wsUrl = `${protocol}://${hostname}:8081`;
            console.log(`Bridge: Connecting ${protocol.toUpperCase()} to ${wsUrl}`);

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log(`Bridge: ${protocol.toUpperCase()} connected`);
                this.connected = true;
                this.httpFallback = false;

                // Register with signaling server
                this.ws.send(JSON.stringify({
                    type: 'register',
                    peerId: this.peerId
                }));
            };

            this.ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    this.handleWSMessage(msg);
                } catch (e) {
                    console.error('Bridge: Bad WS message', e);
                }
            };

            this.ws.onclose = (ev) => {
                console.log('Bridge: WebSocket disconnected', ev?.code, ev?.reason || '');
                this.connected = false;
                this.httpFallback = true;
                // Reconnect after 3s
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = setTimeout(() => this.connectWebSocket(), 3000);
            };

            this.ws.onerror = (err) => {
                console.warn('Bridge: WebSocket error, falling back to HTTP', err);
                this.httpFallback = true;
            };
        } catch (e) {
            console.warn('Bridge: WebSocket not available, using HTTP fallback');
            this.httpFallback = true;
        }
    }

    handleWSMessage(msg) {
        switch (msg.type) {
            case 'peers':
                console.log('Bridge: Known peers:', msg.peers);
                // Notify mesh unit about existing peers
                msg.peers.forEach(peerId => {
                    this.bus.publish({
                        id: `ws_peer_${Date.now()}`,
                        type: 'mesh.peer-available',
                        source: this.id,
                        timestamp: Date.now(),
                        content: `Peer available: ${peerId}`,
                        payload: { peerId, source: 'signaling' }
                    });
                });
                break;

            case 'peer-joined':
                console.log('Bridge: Peer joined:', msg.peerId);
                this.bus.publish({
                    id: `ws_join_${Date.now()}`,
                    type: 'mesh.peer-available',
                    source: this.id,
                    timestamp: Date.now(),
                    content: `Peer joined: ${msg.peerId}`,
                    payload: { peerId: msg.peerId, source: 'signaling' }
                });
                break;

            case 'peer-left':
                console.log('Bridge: Peer left:', msg.peerId);
                this.bus.publish({
                    id: `ws_leave_${Date.now()}`,
                    type: 'mesh.peer-left',
                    source: this.id,
                    timestamp: Date.now(),
                    content: `Peer left: ${msg.peerId}`,
                    payload: { peerId: msg.peerId }
                });
                break;

            case 'offer':
            case 'answer':
            case 'ice-candidate':
                // Forward WebRTC signaling to mesh unit
                this.bus.publish({
                    id: `sig_${Date.now()}`,
                    type: `mesh.signal.${msg.type}`,
                    source: this.id,
                    timestamp: Date.now(),
                    content: `Signal: ${msg.type}`,
                    payload: { signal: msg, source: msg.source }
                });
                break;

            case 'remote-command':
                console.log('Bridge: Remote command via WS:', msg.command);
                this.handleCommand(msg.command);
                break;

            case 'broadcast':
                this.bus.publish({
                    id: `bc_${Date.now()}`,
                    type: 'mesh.broadcast-received',
                    source: this.id,
                    timestamp: Date.now(),
                    content: 'Broadcast received',
                    payload: { data: msg.data, from: msg.source }
                });
                break;
        }
    }

    /**
     * Send a signaling message through the WebSocket to the server
     */
    sendSignal(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
            return true;
        }
        return false;
    }

    pollForCommands() {
        setInterval(() => {
            fetch('/cmd')
                .then(res => res.json())
                .then(data => {
                    if (data.command) {
                        console.log('Bridge: Received command via HTTP poll:', data.command);
                        this.handleCommand(data.command);
                    }
                })
                .catch(() => {});
        }, 2000);
    }

    async handleCommand(cmd) {
        if (cmd === 'reload') {
            console.log('Bridge: Executing Remote Reload...');
            window.location.reload();
        } else if (cmd === 'screenshot') {
            await this.captureScreen();
        } else if (cmd === 'state') {
            this.sendLog('state-snapshot', 'System state requested', {
                peerId: this.peerId,
                wsConnected: this.connected,
                uptime: Date.now()
            });
        }
    }

    async captureScreen() {
        console.log('Bridge: Capturing screenshot...');
        try {
            // Ensure html2canvas is loaded
            if (typeof html2canvas === 'undefined') {
                await this.loadScript('assets/libs/html2canvas.min.js');
            }

            // Use allowTaint + useCORS to avoid SecurityError on iOS Safari
            const canvas = await html2canvas(document.body, {
                allowTaint: true,
                useCORS: true,
                logging: false,
                scale: 1,
                backgroundColor: '#0d1117'
            });

            // Use toDataURL instead of toBlob to avoid SecurityError on iOS Safari HTTP
            const dataUrl = canvas.toDataURL('image/png');
            const binary = atob(dataUrl.split(',')[1]);
            const array = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                array[i] = binary.charCodeAt(i);
            }
            const blob = new Blob([array], { type: 'image/png' });
            this.uploadScreenshot(blob);
        } catch (e) {
            console.error('Bridge: Screenshot failed', e);
            // Fallback: send DOM snapshot as text
            this.sendLog('error', 'Screenshot failed, sending DOM text', {
                error: e.toString(),
                bodyText: document.body.innerText?.substring(0, 2000)
            });
        }
    }

    uploadScreenshot(blob) {
        const filename = `screenshot_${Date.now()}.png`;
        fetch('/upload', {
            method: 'POST',
            headers: {
                'X-Filename': filename,
                'Content-Type': 'image/png'
            },
            body: blob
        }).then(() => {
            console.log('Bridge: Screenshot uploaded', filename);
        }).catch(e => console.error('Upload failed', e));
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    sendLog(level, message, payload = {}) {
        // Send via WebSocket if connected
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'debug-log',
                level,
                message,
                payload,
                timestamp: Date.now()
            }));
        }

        // Also send via HTTP (always, for the terminal log display)
        if (this.httpFallback || level === 'error') {
            fetch('/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: level.toUpperCase(),
                    message: message,
                    payload: payload
                })
            }).catch(() => {});
        }
    }
}
