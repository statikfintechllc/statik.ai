/**
 * dns.u.js – Decentralised DNS / Naming
 *
 * Alternative naming systems that bypass traditional ICANN domains:
 *   1. ENS  (.eth)   – Ethereum Name Service
 *   2. HNS  (/)      – Handshake top-level domains
 *   3. IPFS (hash)   – Content-addressed via IPFS gateway
 *   4. Nostr (NIP-05) – Censorship-resistant relay names
 *   5. mDNS (.local) – Zero-config local network
 *
 * Principles:
 *   - Never squat on names owned by others
 *   - Only register names the user explicitly requests
 *   - Support multiple naming systems simultaneously
 *   - Educate user on costs and implications
 */

export class DNSUnit {
  constructor(bus) {
    this.bus = bus;
    this.id = 'dns.u';
    this.registrations = new Map(); // name → { system, endpoint, status }
  }

  init() {
    this.bus.emit('unit.ready', { unitId: this.id });
  }

  /** Check if a name is available on a given system */
  async checkAvailability(name, system) {
    // TODO: query the appropriate naming system
    return { name, system, available: null, status: 'not_implemented' };
  }

  /** Register a name on a given system */
  async register(name, system, endpoint) {
    // TODO: guide user through registration (wallet connect for ENS, etc.)
    this.registrations.set(name, { system, endpoint, status: 'pending' });
    this.bus.emit('dns.registered', { name, system, endpoint });
    return { name, system, status: 'not_implemented' };
  }

  /** Resolve a name to an endpoint */
  async resolve(name) {
    // Local registry first
    if (this.registrations.has(name)) return this.registrations.get(name);
    // TODO: query naming systems
    return null;
  }

  /** List all registered names */
  list() {
    return [...this.registrations.entries()].map(([name, info]) => ({ name, ...info }));
  }

  destroy() {}
}
