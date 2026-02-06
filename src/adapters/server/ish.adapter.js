/**
 * ish.adapter.js – iSH Local Server Adapter
 *
 * Detects iSH (Alpine Linux on iOS) environment and bootstraps
 * a local HTTP server for self-hosting Statik.ai on-device.
 *
 * Setup flow:
 *   1. Detect iSH environment
 *   2. Write server script to OPFS
 *   3. Bind to localhost:8080
 *   4. Advertise via mDNS (statik.local)
 */

export class ISHAdapter {
  constructor() {
    this.detected = false;
    this.port = 8080;
  }

  /** Detect if running inside iSH */
  detect() {
    // iSH identifies as Alpine Linux in user agent
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    this.detected = /Alpine|iSH/i.test(ua);
    return this.detected;
  }

  /** Generate a minimal Node.js HTTP server script */
  generateServerScript(rootDir) {
    return `
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = ${this.port};
const ROOT = '${rootDir}';
const MIME = {
  '.html': 'text/html', '.js': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml',
};

http.createServer((req, res) => {
  const file = path.join(ROOT, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(file);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log('Statik.ai @ http://localhost:' + PORT));
`.trim();
  }

  /** Get the local network URL (placeholder) */
  getLocalURL() {
    return `http://localhost:${this.port}`;
  }
}
