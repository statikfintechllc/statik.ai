/**
 * node.adapter.js – Node.js HTTP Server Adapter
 *
 * Standalone HTTP server for running Statik.ai outside the browser.
 * Used when self-hosting from a laptop, desktop, or iSH on iPhone.
 *
 * Usage: node src/adapters/server/node.adapter.js
 */

export class NodeServerAdapter {
  constructor(port = 8080) {
    this.port = port;
    this.server = null;
  }

  /** Start the HTTP server (Node.js only) */
  async start(rootDir) {
    // This module is a placeholder for Node.js environments.
    // In the browser, use sw.proxy.js instead.
    //
    // When running in Node:
    //   const http = require('http');
    //   const fs = require('fs');
    //   ... serve static files from rootDir ...

    console.log(`[node.adapter] placeholder – start server at :${this.port}`);
    return { port: this.port, rootDir, status: 'not_implemented' };
  }

  /** Stop the server */
  async stop() {
    if (this.server) {
      // TODO: this.server.close()
      this.server = null;
    }
  }

  /** Return the server's local URL */
  getURL() {
    return `http://localhost:${this.port}`;
  }
}
