import http.server
import ssl
import json
import sys
import os
import time
import threading
import asyncio
import socket as _socket
import websockets

# Repository root (absolute)
REPO_ROOT = '/home/statikfintechllc/builds/statik.ai'
# Use cert/key from repository root only (per user instruction)
CERT_FILE = os.path.join(REPO_ROOT, 'cert.pem')
KEY_FILE  = os.path.join(REPO_ROOT, 'key.pem')

# Fail fast if cert/key missing
missing = [p for p in (CERT_FILE, KEY_FILE) if not os.path.isfile(p)]
if missing:
    print(f"[SSL ERROR] Missing file(s): {', '.join(missing)}. Expected in repo root: {REPO_ROOT}")
    sys.exit(1)

print(f"[SSL] Using cert: {CERT_FILE}")
print(f"[SSL] Using key:  {KEY_FILE}")
sys.stdout.flush()

PORT = 8080
WS_PORT = 8081
COMMAND_QUEUE = []
COGNITIVE_LOG = []
MAX_COGNITIVE_LOG = 500

# ── WebSocket Signaling Server (port 8081) ──────────────────────────
WS_PEERS = {}   # peer_id -> websocket object
WS_LOCK = threading.Lock()
ws_loop = None  # asyncio event loop for WS server (set in ws thread)


async def ws_handler(websocket, path):
    """Handle a WebSocket connection using the websockets library."""
    peer_id = None
    addr = websocket.remote_address
    print(f"[WS] Connection from {addr}")
    sys.stdout.flush()

    try:
        async for raw in websocket:
            try:
                msg = json.loads(raw)
            except Exception:
                continue

            msg_type = msg.get('type')

            if msg_type == 'register':
                peer_id = msg.get('peerId', f'peer_{id(websocket)}')
                with WS_LOCK:
                    WS_PEERS[peer_id] = websocket
                    peers = [p for p in WS_PEERS if p != peer_id]
                await websocket.send(json.dumps({'type': 'peers', 'peers': peers}))
                with WS_LOCK:
                    notify = [(pid, ws) for pid, ws in WS_PEERS.items() if pid != peer_id]
                for pid, ws in notify:
                    try:
                        await ws.send(json.dumps({'type': 'peer-joined', 'peerId': peer_id}))
                    except Exception:
                        pass
                print(f"[WS] Peer registered: {peer_id} from {addr}")
                sys.stdout.flush()

            elif msg_type in ('offer', 'answer', 'ice-candidate'):
                target = msg.get('target')
                if target:
                    with WS_LOCK:
                        tc = WS_PEERS.get(target)
                    if tc:
                        msg['source'] = peer_id
                        try:
                            await tc.send(json.dumps(msg))
                        except Exception:
                            pass
                        print(f"[WS] Signal {msg_type}: {peer_id} -> {target}")
                        sys.stdout.flush()

            elif msg_type == 'broadcast':
                with WS_LOCK:
                    targets = [(pid, ws) for pid, ws in WS_PEERS.items() if pid != peer_id]
                for pid, ws in targets:
                    try:
                        await ws.send(json.dumps({
                            'type': 'broadcast',
                            'source': peer_id,
                            'data': msg.get('data')
                        }))
                    except Exception:
                        pass

            elif msg_type == 'debug-log':
                log_entry = {
                    'timestamp': time.time(),
                    'peer': peer_id,
                    'level': msg.get('level', 'info'),
                    'message': msg.get('message', ''),
                    'payload': msg.get('payload', {})
                }
                COGNITIVE_LOG.append(log_entry)
                if len(COGNITIVE_LOG) > MAX_COGNITIVE_LOG:
                    COGNITIVE_LOG.pop(0)
                lvl = msg.get('level','info')
                m = msg.get('message','')
                if lvl not in ('bus-event',):  # don't spam bus events to terminal
                    print(f"[WS-LOG] [{peer_id}] {lvl}: {m}")
                    sys.stdout.flush()

            elif msg_type == 'device-info':
                info = msg.get('info', {})
                COGNITIVE_LOG.append({
                    'timestamp': time.time(),
                    'peer': peer_id,
                    'level': 'device-info',
                    'message': 'Device telemetry',
                    'payload': info
                })
                if len(COGNITIVE_LOG) > MAX_COGNITIVE_LOG:
                    COGNITIVE_LOG.pop(0)
                print(f"[DEVICE] {peer_id}: {info.get('platform','')} | {info.get('screen','')} | Battery: {info.get('battery',{}).get('level','?')}")
                sys.stdout.flush()

            elif msg_type == 'screenshot-data':
                # Receive raw base64 PNG screenshot over WS
                import base64
                b64 = msg.get('data', '')
                if b64:
                    try:
                        png_bytes = base64.b64decode(b64)
                        fname = f"screenshot_{int(time.time()*1000)}.png"
                        save_dir = 'screenshots'
                        os.makedirs(save_dir, exist_ok=True)
                        fpath = os.path.join(save_dir, fname)
                        with open(fpath, 'wb') as f:
                            f.write(png_bytes)
                        print(f"[SCREENSHOT] Saved {len(png_bytes)} bytes to {fpath}")
                        sys.stdout.flush()
                        await websocket.send(json.dumps({'type': 'screenshot-ack', 'file': fname}))
                    except Exception as e:
                        print(f"[SCREENSHOT ERROR] {e}")
                        sys.stdout.flush()

    except websockets.exceptions.ConnectionClosed:
        pass
    except Exception as e:
        print(f"[WS] Error for {peer_id or addr}: {e}")
        sys.stdout.flush()
    finally:
        if peer_id:
            with WS_LOCK:
                WS_PEERS.pop(peer_id, None)
                notify = list(WS_PEERS.items())
            for pid, ws in notify:
                try:
                    await ws.send(json.dumps({'type': 'peer-left', 'peerId': peer_id}))
                except Exception:
                    pass
            print(f"[WS] Peer disconnected: {peer_id}")
            sys.stdout.flush()


def start_ws_server():
    """Run the websockets server in its own asyncio event loop (background thread)."""
    global ws_loop
    ws_loop = asyncio.new_event_loop()
    asyncio.set_event_loop(ws_loop)
    # Use SSL for WSS
    ssl_ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    try:
        ssl_ctx.load_cert_chain(CERT_FILE, KEY_FILE)
    except Exception as e:
        print(f"[SSL ERROR] Failed to load cert/key for WSS: {e}")
        sys.exit(1)
    start_server = websockets.serve(ws_handler, '', WS_PORT, ssl=ssl_ctx, max_size=20*1024*1024)
    ws_loop.run_until_complete(start_server)
    print(f"[WSS] Secure WebSocket server on port {WS_PORT}")
    sys.stdout.flush()
    ws_loop.run_forever()


# ── HTTP Handler (port 8080) ───────────────────────────────────────

class LogHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Filename')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def generate_manifest(self):
        manifest = []
        base_dir = os.getcwd()
        EXCLUDE_DIRS = {'.git', 'node_modules', '__pycache__', '.gemini'}
        EXCLUDE_FILES = {'.DS_Store', 'sfti.iso', 'server.py'}
        for root, dirs, files in os.walk(base_dir):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for file in files:
                if file in EXCLUDE_FILES:
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, base_dir)
                size = os.path.getsize(full_path)
                clean_path = rel_path.replace(os.sep, '/')
                manifest.append({"path": clean_path, "size": size, "mtime": os.path.getmtime(full_path)})
        print(f"[MANIFEST] Generated: {len(manifest)} files")
        return manifest

    def do_GET(self):
        if self.path == '/cmd':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            cmd = COMMAND_QUEUE.pop(0) if COMMAND_QUEUE else None
            if cmd:
                print(f"[SERVER] Sending command to client: {cmd}")
            self.wfile.write(json.dumps({"command": cmd}).encode('utf-8'))

        elif self.path == '/manifest':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(self.generate_manifest()).encode('utf-8'))

        elif self.path == '/debug/peers':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            with WS_LOCK:
                peers = list(WS_PEERS.keys())
            self.wfile.write(json.dumps({"peers": peers}).encode('utf-8'))

        elif self.path == '/debug/snapshot':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            with WS_LOCK:
                peers = list(WS_PEERS.keys())
            self.wfile.write(json.dumps({"peers": peers, "commands_pending": len(COMMAND_QUEUE)}).encode('utf-8'))

        elif self.path == '/debug/cognitive':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            with WS_LOCK:
                peers = list(WS_PEERS.keys())
            self.wfile.write(json.dumps({
                'events': COGNITIVE_LOG[-200:],
                'peers': peers,
                'stats': {
                    'total_events': len(COGNITIVE_LOG),
                    'commands_pending': len(COMMAND_QUEUE),
                    'peers_connected': len(peers)
                }
            }).encode('utf-8'))

        elif self.path == '/debug/device':
            # Return latest device-info from cognitive log
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            device_info = None
            for entry in reversed(COGNITIVE_LOG):
                if entry.get('level') == 'device-info':
                    device_info = entry.get('payload', {})
                    break
            self.wfile.write(json.dumps({'device': device_info}).encode('utf-8'))

        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/log':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                print(f"[DEVICE LOG] {data.get('type', 'INFO')}: {data.get('message', '')} {data.get('payload', '')}")
                sys.stdout.flush()
            except Exception as e:
                print(f"Error parsing log: {e}")
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')

        elif self.path == '/upload':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                filename = self.headers.get('X-Filename', f'upload_{int(time.time())}.bin')
                safe_filename = os.path.basename(filename)
                save_dir = 'screenshots'
                os.makedirs(save_dir, exist_ok=True)
                file_path = os.path.join(save_dir, safe_filename)
                with open(file_path, 'wb') as f:
                    f.write(post_data)
                print(f"[UPLOAD] Saved {content_length} bytes to {file_path}")
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'{"status":"uploaded"}')
            except Exception as e:
                print(f"[UPLOAD ERROR] {e}")
                self.send_error(500, str(e))

        elif self.path == '/admin/cmd':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            try:
                data = json.loads(post_data.decode('utf-8'))
                cmd = data.get('cmd')
                if cmd:
                    COMMAND_QUEUE.append(cmd)
                    print(f"[ADMIN] Queued command: {cmd}")
                    # Also push via WebSocket (async from sync context)
                    with WS_LOCK:
                        peers_snapshot = list(WS_PEERS.items())
                    if ws_loop and peers_snapshot:
                        for pid, ws in peers_snapshot:
                            try:
                                asyncio.run_coroutine_threadsafe(
                                    ws.send(json.dumps({'type': 'remote-command', 'command': cmd})),
                                    ws_loop
                                )
                            except Exception:
                                pass
            except Exception as e:
                print(f"Error parsing admin cmd: {e}")
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"status":"ok"}')

        else:
            self.send_error(404, "Not Found")


# ── Startup ─────────────────────────────────────────────────────────

def get_local_ip():
    try:
        s = _socket.socket(_socket.AF_INET, _socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

Handler = LogHandler
http.server.ThreadingHTTPServer.allow_reuse_address = True
local_ip = get_local_ip()

# SSL context for HTTPS
ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
try:
    ssl_context.load_cert_chain(CERT_FILE, KEY_FILE)
except Exception as e:
    print(f"[SSL ERROR] Failed to load cert/key for HTTPS: {e}")
    sys.exit(1)

# Start WSS server in background thread
ws_thread = threading.Thread(target=start_ws_server, daemon=True)
ws_thread.start()
time.sleep(0.5)

with http.server.ThreadingHTTPServer(("", PORT), Handler) as httpd:
    httpd.socket = ssl_context.wrap_socket(httpd.socket, server_side=True)
    print("=" * 60)
    print("  Statik.ai Debug Server (HTTPS + WSS)")
    print("=" * 60)
    print(f"  HTTPS:     https://localhost:{PORT}")
    print(f"  Network:   https://{local_ip}:{PORT}")
    print(f"  WSS:       wss://{local_ip}:{WS_PORT}")
    print(f"  Peers:     https://localhost:{PORT}/debug/peers")
    print(f"  Cognitive: https://localhost:{PORT}/debug/cognitive")
    print(f"  Device:    https://localhost:{PORT}/debug/device")
    print("" )
    print(f"  NOTE: On iPhone, visit https://{local_ip}:{PORT}")
    print(f"         Accept the cert warning to load.")
    print("=" * 60)
    sys.stdout.flush()
    httpd.serve_forever()
