import http.server
import socketserver
import json
import sys
import os

PORT = 8080
COMMAND_QUEUE = []

class LogHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable caching to fix service worker update issues
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path == '/cmd':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            cmd = None
            if COMMAND_QUEUE:
                cmd = COMMAND_QUEUE.pop(0)
                print(f"[SERVER] Sending command to client: {cmd}")
            
            self.wfile.write(json.dumps({"command": cmd}).encode('utf-8'))
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/log':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                # Print log to terminal in a distinct way
                print(f"[DEVICE LOG] {data.get('type', 'INFO')}: {data.get('message', '')} {data.get('payload', '')}")
                sys.stdout.flush() 
            except Exception as e:
                print(f"Error parsing log: {e}")
            
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
        elif self.path == '/admin/cmd':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                cmd = data.get('cmd')
                if cmd:
                    COMMAND_QUEUE.append(cmd)
                    print(f"[ADMIN] Queued command: {cmd}")
            except Exception as e:
                print(f"Error parsing admin cmd: {e}")

            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')
        else:
            self.send_error(404, "Not Found")

# Ensure we bind to all interfaces
Handler = LogHandler
# Allow reuse of address to avoid "Address already in use" errors on restart
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at port {PORT} with Live Logging...")
    httpd.serve_forever()
