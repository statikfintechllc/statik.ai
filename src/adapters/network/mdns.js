/**
 * mdns.js – mDNS / Bonjour Discovery
 *
 * Zero-config local network discovery using .local domains.
 * Advertises as statik.local for automatic peer finding.
 *
 * Note: Browser-based mDNS is limited. This adapter provides
 * the interface; actual mDNS requires Node.js / iSH environment.
 */

export class mDNSAdapter {
  constructor() {
    this.serviceName = 'statik-ai';
    this.domain = 'statik.local';
  }

  /** Advertise this instance on the local network (Node.js only) */
  async advertise(port = 8080) {
    // TODO: requires Node.js mdns or dns-sd module
    // In browser context, this is a no-op
    console.log(`[mdns] would advertise ${this.domain}:${port}`);
    return { domain: this.domain, port, status: 'not_implemented' };
  }

  /** Browse for other Statik.ai instances on the network */
  async browse() {
    // TODO: requires Node.js mdns or dns-sd module
    return [];
  }

  /** Stop advertising */
  async stop() {
    // TODO: clean up mdns advertisement
  }
}
