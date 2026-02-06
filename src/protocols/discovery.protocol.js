/**
 * discovery.protocol.js – Instance Discovery Protocol
 *
 * Defines the message format and handshake flow for
 * Statik.ai instances finding each other on a network.
 *
 * Flow:
 *   1. Instance broadcasts 'instance.announce'
 *   2. Peers respond with 'instance.ack'
 *   3. Both sides negotiate transport (WebRTC, WS, local)
 *   4. Connection established via mesh.u
 */

export class DiscoveryProtocol {
  constructor(bus) {
    this.bus = bus;
  }

  /** Create an announcement message */
  createAnnounce(instanceId, endpoints, capabilities) {
    return {
      type: 'instance.announce',
      version: '0.1.0',
      payload: {
        instance_id: instanceId,
        transport: ['webrtc', 'websocket', 'local'],
        capabilities: capabilities || [],
        endpoints: endpoints || [],
        timestamp: Date.now(),
      },
    };
  }

  /** Create an acknowledgement response */
  createAck(instanceId, targetId) {
    return {
      type: 'instance.ack',
      version: '0.1.0',
      payload: {
        instance_id: instanceId,
        target_id: targetId,
        timestamp: Date.now(),
      },
    };
  }

  /** Validate a discovery message */
  validate(msg) {
    if (!msg?.type || !msg?.payload?.instance_id) {
      return { valid: false, error: 'Missing type or instance_id' };
    }
    return { valid: true, error: null };
  }
}
