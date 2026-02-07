/**
 * WebRTC Mesh Networking Adapter
 * Real RTCPeerConnection + DataChannel implementation
 */

const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
];

export class WebRTCMesh {
    constructor(id) {
        this.id = id;
        this.peers = new Map();        // peerId -> { pc: RTCPeerConnection, dc: RTCDataChannel }
        this.onMessage = null;         // callback(peerId, data)
        this.onPeerConnected = null;   // callback(peerId)
        this.onPeerDisconnected = null; // callback(peerId)
        this.sendSignal = null;        // function to send signaling messages via bridge
    }

    /**
     * Create an offer and initiate connection to a peer
     */
    async connect(targetPeerId) {
        console.log(`WebRTC: Initiating connection to ${targetPeerId}`);

        const pc = this._createPeerConnection(targetPeerId);

        // Create data channel (offerer creates it)
        const dc = pc.createDataChannel('statik-mesh', {
            ordered: true
        });
        this._setupDataChannel(dc, targetPeerId);

        // Create and send offer
        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Send offer through signaling server
            if (this.sendSignal) {
                this.sendSignal({
                    type: 'offer',
                    target: targetPeerId,
                    sdp: pc.localDescription.sdp
                });
            }

            this.peers.set(targetPeerId, { pc, dc, state: 'connecting' });
            console.log(`WebRTC: Offer sent to ${targetPeerId}`);
            return true;
        } catch (err) {
            console.error(`WebRTC: Failed to create offer for ${targetPeerId}`, err);
            pc.close();
            return false;
        }
    }

    /**
     * Handle incoming offer from remote peer
     */
    async handleOffer(remotePeerId, sdp) {
        console.log(`WebRTC: Received offer from ${remotePeerId}`);

        const pc = this._createPeerConnection(remotePeerId);

        // Listen for data channel from offerer
        pc.ondatachannel = (event) => {
            console.log(`WebRTC: Data channel received from ${remotePeerId}`);
            this._setupDataChannel(event.channel, remotePeerId);
            const peer = this.peers.get(remotePeerId);
            if (peer) peer.dc = event.channel;
        };

        try {
            await pc.setRemoteDescription(new RTCSessionDescription({
                type: 'offer', sdp
            }));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            if (this.sendSignal) {
                this.sendSignal({
                    type: 'answer',
                    target: remotePeerId,
                    sdp: pc.localDescription.sdp
                });
            }

            this.peers.set(remotePeerId, { pc, dc: null, state: 'connecting' });
            console.log(`WebRTC: Answer sent to ${remotePeerId}`);
        } catch (err) {
            console.error(`WebRTC: Failed to handle offer from ${remotePeerId}`, err);
            pc.close();
        }
    }

    /**
     * Handle incoming answer from remote peer
     */
    async handleAnswer(remotePeerId, sdp) {
        const peer = this.peers.get(remotePeerId);
        if (!peer) {
            console.warn(`WebRTC: No pending connection for ${remotePeerId}`);
            return;
        }

        try {
            await peer.pc.setRemoteDescription(new RTCSessionDescription({
                type: 'answer', sdp
            }));
            console.log(`WebRTC: Answer accepted from ${remotePeerId}`);
        } catch (err) {
            console.error(`WebRTC: Failed to set answer from ${remotePeerId}`, err);
        }
    }

    /**
     * Handle incoming ICE candidate
     */
    async handleIceCandidate(remotePeerId, candidate) {
        const peer = this.peers.get(remotePeerId);
        if (!peer) return;

        try {
            await peer.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
            console.error(`WebRTC: Failed to add ICE candidate from ${remotePeerId}`, err);
        }
    }

    /**
     * Send data to a specific peer via data channel
     */
    send(targetPeerId, data) {
        const peer = this.peers.get(targetPeerId);
        if (!peer || !peer.dc || peer.dc.readyState !== 'open') {
            console.warn(`WebRTC: Cannot send to ${targetPeerId} (not connected)`);
            return false;
        }

        try {
            const payload = typeof data === 'string' ? data : JSON.stringify(data);
            peer.dc.send(payload);
            return true;
        } catch (err) {
            console.error(`WebRTC: Send failed to ${targetPeerId}`, err);
            return false;
        }
    }

    /**
     * Broadcast data to all connected peers
     */
    broadcast(data) {
        let sent = 0;
        this.peers.forEach((peer, id) => {
            if (this.send(id, data)) sent++;
        });
        return sent;
    }

    /**
     * Disconnect from a specific peer
     */
    disconnect(peerId) {
        const peer = this.peers.get(peerId);
        if (peer) {
            if (peer.dc) peer.dc.close();
            peer.pc.close();
            this.peers.delete(peerId);
            console.log(`WebRTC: Disconnected from ${peerId}`);
        }
    }

    /**
     * Get list of connected peer IDs
     */
    getConnectedPeers() {
        const connected = [];
        this.peers.forEach((peer, id) => {
            if (peer.state === 'connected') connected.push(id);
        });
        return connected;
    }

    // ── Private ────────────────────────────────────────────────────

    _createPeerConnection(peerId) {
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        pc.onicecandidate = (event) => {
            if (event.candidate && this.sendSignal) {
                this.sendSignal({
                    type: 'ice-candidate',
                    target: peerId,
                    candidate: event.candidate.toJSON()
                });
            }
        };

        pc.oniceconnectionstatechange = () => {
            const state = pc.iceConnectionState;
            console.log(`WebRTC: ICE state for ${peerId}: ${state}`);

            const peer = this.peers.get(peerId);
            if (!peer) return;

            if (state === 'connected' || state === 'completed') {
                peer.state = 'connected';
                if (this.onPeerConnected) this.onPeerConnected(peerId);
            } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                peer.state = 'disconnected';
                if (this.onPeerDisconnected) this.onPeerDisconnected(peerId);
                this.peers.delete(peerId);
            }
        };

        return pc;
    }

    _setupDataChannel(dc, peerId) {
        dc.onopen = () => {
            console.log(`WebRTC: Data channel open with ${peerId}`);
            const peer = this.peers.get(peerId);
            if (peer) {
                peer.state = 'connected';
                peer.dc = dc;
            }
            if (this.onPeerConnected) this.onPeerConnected(peerId);
        };

        dc.onclose = () => {
            console.log(`WebRTC: Data channel closed with ${peerId}`);
        };

        dc.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (this.onMessage) this.onMessage(peerId, data);
            } catch (e) {
                // Plain text message
                if (this.onMessage) this.onMessage(peerId, event.data);
            }
        };

        dc.onerror = (err) => {
            console.error(`WebRTC: Data channel error with ${peerId}`, err);
        };
    }
}
