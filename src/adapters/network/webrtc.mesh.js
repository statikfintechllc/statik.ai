/**
 * webrtc.mesh.js – WebRTC Mesh Networking
 *
 * Manages peer-to-peer connections between Statik.ai instances
 * using WebRTC data channels. No signaling server required for
 * local network; uses STUN/TURN for remote connections.
 */

export class WebRTCMesh {
  constructor(config = {}) {
    this.peers = new Map(); // peerId → { pc, channel }
    this.config = {
      iceServers: config.iceServers || [],
    };
  }

  /** Create an offer to connect to a peer */
  async createOffer(peerId) {
    if (typeof RTCPeerConnection === 'undefined') return null;

    const pc = new RTCPeerConnection(this.config);
    const channel = pc.createDataChannel('statik_data');

    this.peers.set(peerId, { pc, channel, role: 'initiator' });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    return { type: 'offer', sdp: offer.sdp, peerId };
  }

  /** Accept an offer and create an answer */
  async acceptOffer(peerId, offer) {
    if (typeof RTCPeerConnection === 'undefined') return null;

    const pc = new RTCPeerConnection(this.config);
    pc.ondatachannel = (e) => {
      this.peers.set(peerId, { ...this.peers.get(peerId), channel: e.channel });
    };

    this.peers.set(peerId, { pc, channel: null, role: 'responder' });

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    return { type: 'answer', sdp: answer.sdp, peerId };
  }

  /** Send data to a peer */
  send(peerId, data) {
    const peer = this.peers.get(peerId);
    if (!peer?.channel || peer.channel.readyState !== 'open') return false;
    peer.channel.send(typeof data === 'string' ? data : JSON.stringify(data));
    return true;
  }

  /** Disconnect from a peer */
  disconnect(peerId) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.pc.close();
      this.peers.delete(peerId);
    }
  }

  /** Disconnect from all peers */
  disconnectAll() {
    for (const [peerId] of this.peers) this.disconnect(peerId);
  }
}
