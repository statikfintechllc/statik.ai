/**
 * ipfs.adapter.js – IPFS Integration
 *
 * Publishes Statik.ai instances to IPFS for decentralised
 * access and content-addressed storage.
 *
 * Access via gateway: https://ipfs.io/ipfs/<hash>
 * Or native: ipfs://<hash>
 */

export class IPFSAdapter {
  constructor() {
    this.node = null;
    this.cid = null;
  }

  /** Initialise IPFS (placeholder) */
  async init() {
    // TODO: integrate with js-ipfs or connect to local IPFS daemon
    console.log('[ipfs] adapter placeholder – pending integration');
    return false;
  }

  /** Publish content to IPFS */
  async publish(content) {
    if (!this.node) return null;
    // TODO: add content to IPFS, return CID
    return { cid: null, status: 'not_implemented' };
  }

  /** Resolve a CID to content */
  async resolve(cid) {
    // Fallback to gateway
    const gatewayUrl = `https://ipfs.io/ipfs/${cid}`;
    // TODO: try local node first, then gateway
    return { url: gatewayUrl, status: 'not_implemented' };
  }

  /** Subscribe to a pubsub topic for peer discovery */
  async subscribeTopic(topic) {
    // TODO: IPFS pubsub for instance discovery
    return { topic, status: 'not_implemented' };
  }

  destroy() {
    if (this.node) {
      // TODO: stop IPFS node
    }
  }
}
