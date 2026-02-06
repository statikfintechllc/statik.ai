/**
 * relay.protocol.js – Message Relay for Federation
 *
 * Routes messages between instances that aren't directly connected.
 * Uses a store-and-forward pattern:
 *
 *   Instance A → relay → Instance C
 *   (when A can't reach C directly but both know B)
 */

export class RelayProtocol {
  constructor(bus) {
    this.bus = bus;
    this.relayTable = new Map(); // targetId → nextHop peerId
  }

  /** Register a relay route */
  addRoute(targetId, nextHopId) {
    this.relayTable.set(targetId, nextHopId);
  }

  /** Remove a relay route */
  removeRoute(targetId) {
    this.relayTable.delete(targetId);
  }

  /** Wrap a message for relay */
  wrap(message, sourceId, targetId) {
    return {
      type: 'relay.forward',
      payload: {
        source: sourceId,
        target: targetId,
        hop_count: 0,
        max_hops: 5,
        message,
        timestamp: Date.now(),
      },
    };
  }

  /** Process a received relay message */
  receive(relayMsg) {
    if (relayMsg.payload.hop_count >= relayMsg.payload.max_hops) {
      return { action: 'drop', reason: 'max_hops_exceeded' };
    }

    // Check if we are the target
    // (caller must check against local instanceId)
    relayMsg.payload.hop_count++;
    return { action: 'forward', nextHop: this.relayTable.get(relayMsg.payload.target) };
  }
}
