# docs/P2P.md

## Statik.ai P2P Networking Architecture

**Version:** 0.1.0
**Last Updated:** March 9, 2026
**Status:** CRITICAL -- Required for mesh operation

---

## Executive Summary

Statik.ai uses a fully decentralized P2P mesh network for instance discovery, connection management, code distribution, state synchronization, and name resolution. There is NO central server, NO signaling server, and NO relay infrastructure. All networking happens directly between peers via WebRTC.

**Core components:**
- **disc.u.js**: Instance discovery (local + remote)
- **mesh.u.js**: WebRTC connection management and data channels
- **sync.u.js**: State synchronization between peers
- **deploy.u.js**: Code distribution and update propagation
- **dns.u.js**: Mesh-internal name resolution

**Key principles:**
1. Zero external dependencies after first connection
2. Mandatory E2E encryption for all mesh traffic
3. Peer identity verified via WebCrypto key pairs
4. Privacy-first: opt-in sync, user controls what is shared

---

## Table of Contents

1. [Network Topology](#network-topology)
2. [Signaling Protocol](#signaling-protocol)
3. [Peer Discovery](#peer-discovery)
4. [NAT Traversal](#nat-traversal)
5. [Data Channel Protocol](#data-channel-protocol)
6. [Sync Protocol](#sync-protocol)
7. [Conflict Resolution](#conflict-resolution)
8. [Security Model](#security-model)
9. [Bootstrap and First Connection](#bootstrap-and-first-connection)
10. [External Dependencies](#external-dependencies)
11. [Performance and Limits](#performance-and-limits)

---

## Network Topology

### Mesh Architecture

Every instance connects to every other discovered instance (full mesh):

```
    [Phone] <--WebRTC--> [Laptop]
       |                     |
    [Tablet] <--WebRTC--> [Desktop]
```

**Constraints:**
- Maximum 10 simultaneous peer connections per instance
- If >10 peers: prioritize by recency of interaction, then proximity
- Minimum 1 connection for mesh functionality
- No hub/spoke: all peers are equal

### Connection Types

| Channel | Purpose | Reliability | Ordering |
|---------|---------|-------------|----------|
| `sync` | State sync, pattern/memory exchange | reliable | ordered |
| `messages` | Real-time bus messages between instances | unreliable | unordered |
| `files` | Code distribution, ISO streaming | reliable | ordered |

---

## Signaling Protocol

WebRTC requires an initial SDP (Session Description Protocol) exchange to establish connections. Without a central signaling server, Statik.ai uses multiple fallback mechanisms:

### Mechanism 1: BroadcastChannel (Same Origin / Same Device)

For tabs/windows on the same device:
```javascript
const bc = new BroadcastChannel('statik-signaling');
bc.postMessage({ type: 'offer', sdp: localDescription, from: instanceId });
bc.onmessage = (e) => { /* handle offer/answer */ };
```
- **Scope:** Same-origin only (same browser, same device)
- **Latency:** <1ms
- **Reliability:** 100% within scope

### Mechanism 2: mDNS/Bonjour (Local Network)

For devices on the same WiFi/LAN:
```
Service: _statik._tcp.local
TXT record: { instance_id, version, public_key_fingerprint }
```
- **Scope:** Local network only
- **Latency:** 1-5 seconds for discovery
- **Reliability:** Depends on network configuration (some routers block mDNS)
- **SDP exchange:** After discovery, SDP exchanged via HTTP on the announced port

### Mechanism 3: Manual QR Code Pairing (Any Network)

For internet-wide connections without any server:
1. Instance A generates SDP offer + instance_id + public key
2. Encodes as QR code (displayed in UI)
3. Instance B scans QR code (camera via hardware.adapter)
4. B generates SDP answer
5. B displays answer as QR code
6. A scans B's QR code
7. Both have SDP offer + answer, WebRTC connection established
- **Scope:** Any network (internet-wide)
- **Latency:** Manual (requires user action)
- **Reliability:** 100% (no network dependency)

### Mechanism 4: IPFS Pubsub (Internet-Wide, Automated)

For automated internet-wide discovery (when available):
```
Topic: /statik-ai/signaling/v1
Message: { type: 'announce', instance_id, public_key, sdp_offer }
```
- **Scope:** Internet-wide (requires IPFS node access)
- **Latency:** 5-30 seconds
- **Reliability:** Depends on IPFS network availability
- **Privacy:** Instance ID and public key are visible on pubsub topic

### Mechanism 5: Shared Secret URL (Copy/Paste)

For remote connections without camera:
1. Instance A generates connection invite: `statik://connect/<base64(sdp_offer + public_key)>`
2. User shares this URL via any messaging app
3. Instance B opens the URL, extracts SDP, generates answer
4. B generates response URL: `statik://accept/<base64(sdp_answer + public_key)>`
5. User shares response back to A
6. Connection established

### Signaling Priority Order

```
1. BroadcastChannel (instant, same-origin)
2. mDNS (fast, same network)
3. IPFS pubsub (automated, internet-wide)
4. Manual QR / URL (universal, requires user)
```

---

## Peer Discovery

### Discovery Flow

```
disc.u init:
  1. Start BroadcastChannel listener
  2. Start mDNS announcements (if on network)
  3. Connect to IPFS pubsub (if available)
  4. Load known peers from IndexedDB
  5. Attempt reconnection to known peers

Every 30 seconds:
  - Send heartbeat on all active channels
  - Check peer health (offline if no heartbeat >2 minutes)
  - Remove stale peers from active list
  - Attempt reconnection to recently-lost peers
```

### Peer Metadata

Each peer announcement includes:
```json
{
  "instance_id": "statik_phone_abc123",
  "version": "0.1.0",
  "public_key_fingerprint": "sha256:abc...",
  "capabilities": ["sync", "mesh", "inference"],
  "load": 0.45,
  "uptime": 3600,
  "peer_count": 2
}
```

### Known Peers Cache

Persisted in IndexedDB (`statik_state.known_peers`):
```json
{
  "instance_id": "statik_laptop_xyz",
  "last_seen": 1710000000000,
  "public_key": "...",
  "signaling_method": "mdns",
  "trust_level": "verified",
  "reconnect_attempts": 0
}
```

---

## NAT Traversal

### STUN Configuration

Public STUN servers for ICE candidate gathering (no self-hosted infrastructure):
```javascript
const config = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ]
};
```

### TURN Fallback

For symmetric NAT (common on mobile carriers where direct WebRTC fails):

**v0.1:** No TURN server. If direct connection fails:
1. Try all STUN servers
2. Try relay through another mesh peer (peer-assisted relay)
3. Fall back to manual QR/URL signaling
4. Mark peer as "unreachable-direct"

**Peer-Assisted Relay:**
If A cannot connect directly to C, but both connect to B:
```
A <--WebRTC--> B <--WebRTC--> C
A sends to B with header: { relay_to: C.instance_id }
B forwards to C via its data channel to C
```
This is NOT a server. B is just another peer that happens to have connectivity to both.

**v0.2 (future):** Optional self-hosted TURN or use of free TURN services.

### ICE Candidate Handling

```javascript
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    // Send candidate to remote peer via signaling channel
    signalingChannel.send({
      type: 'ice-candidate',
      candidate: event.candidate,
      from: this.instanceId
    });
  }
};
```

**Trickle ICE:** Candidates sent as they are gathered (not batched).
**ICE restart:** If connection drops, renegotiate ICE without full SDP exchange.

---

## Data Channel Protocol

### Channel Configuration

```javascript
// Reliable ordered channel for sync and files
const syncChannel = peerConnection.createDataChannel('sync', {
  ordered: true,
  maxRetransmits: null  // reliable
});

// Unreliable unordered channel for real-time messages
const msgChannel = peerConnection.createDataChannel('messages', {
  ordered: false,
  maxRetransmits: 0  // fire and forget
});

// Reliable ordered channel for large file transfers
const fileChannel = peerConnection.createDataChannel('files', {
  ordered: true,
  maxRetransmits: null
});
```

### Message Format

All messages on all channels use this envelope:
```json
{
  "msg_id": "unique-uuid-v4",
  "type": "sync.state | sync.request | sync.response | file.chunk | bus.relay | ping | pong",
  "from": "instance_id",
  "to": "instance_id | 'broadcast'",
  "timestamp": 1710000000000,
  "payload": { },
  "signature": "base64(sign(payload, privateKey))"
}
```

### File Transfer Protocol

Large files (sfti.iso, source files) are chunked:
```
1. Sender: Split file into 64KB chunks
2. Sender: Send header: { type: 'file.start', name, size, hash, chunks }
3. Sender: Send chunks: { type: 'file.chunk', index, data, chunk_hash }
4. Receiver: Verify each chunk hash
5. Receiver: Reassemble when all chunks received
6. Receiver: Verify final file hash
7. Receiver: Send ACK: { type: 'file.complete', name, hash }
```

---

## Sync Protocol

### What Syncs (User-Controlled)

| Data Type | Default | Sync Direction | Conflict Resolution |
|-----------|---------|----------------|---------------------|
| Memories (episodic) | opt-in | bidirectional | merge by timestamp |
| Patterns (confidence) | opt-in | bidirectional | higher confidence wins |
| Goals | opt-in | bidirectional | higher priority wins |
| Source code (VFS) | opt-in | bidirectional | version vector (see deploy.u) |
| Config | manual trigger | bidirectional | local wins (explicit override) |
| Private data | never | - | - |

### Sync Flow

```
sync.u on Instance A:
  1. Receive 'sync.request' from peer B via mesh
  2. Gather local data to sync (filtered by user preferences)
  3. Generate sync diff (what A has that B doesn't)
  4. Send diff via 'sync' data channel
  5. Receive B's diff
  6. Apply B's diff with conflict resolution
  7. Emit 'sync.complete' with summary
```

### Version Vectors

Each instance maintains a version vector:
```json
{
  "statik_phone_abc": 42,
  "statik_laptop_xyz": 37,
  "statik_tablet_def": 15
}
```

When syncing:
1. Exchange version vectors
2. Identify entries where remote > local (remote has newer data)
3. Request only those entries
4. After applying: merge version vectors (take max per instance)

---

## Conflict Resolution

### Per-Data-Type Rules

**Memories:**
- Same memory ID with different content -> keep both, tag as variants
- Merge strategy: union (never delete memories during sync)

**Patterns:**
- Same pattern ID, different confidence -> take higher confidence
- Same pattern ID, different regex -> keep both as separate patterns with shared lineage

**Goals:**
- Same goal ID -> higher priority wins
- Both completed -> merge results

**Source code (VFS files):**
- Same file, different content -> version vector determines winner
- Loser preserved as `.conflict` file
- User notified for manual merge

**Config:**
- Local always wins unless user explicitly requests remote config
- Config sync is manual-trigger-only, never automatic

---

## Security Model

### Mandatory E2E Encryption

ALL mesh traffic MUST be encrypted. This is NOT optional.

```javascript
// Key generation at first boot
const keyPair = await crypto.subtle.generateKey(
  { name: 'RSA-OAEP', modulusLength: 4096, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['encrypt', 'decrypt']
);
```

### Peer Identity

Each instance has:
- **Key pair:** RSA-4096, generated at first boot, stored in IndexedDB
- **Fingerprint:** SHA-256 of public key (displayed in UI for verification)
- **Instance ID:** Derived from public key fingerprint (unique, tamper-proof)

### Trust Bootstrapping

When two instances connect for the first time:
1. Exchange public keys during signaling
2. Both display key fingerprints in UI
3. User verifies fingerprints match (visual/verbal confirmation)
4. On confirmation: peer marked as "verified" in known_peers
5. Future connections auto-verify via stored public key

**Trust levels:**
- `unknown`: First contact, unverified
- `verified`: User has confirmed fingerprint match
- `trusted`: Verified + successful sync history

### Message Signing

Every message payload is signed with the sender's private key:
```javascript
const signature = await crypto.subtle.sign(
  { name: 'RSA-PSS', saltLength: 32 },
  privateKey,
  new TextEncoder().encode(JSON.stringify(payload))
);
```

Receiver verifies signature against sender's public key before processing.

### Rate Limiting

Per-peer rate limits to prevent DoS:
- Max 100 sync messages per minute
- Max 1000 bus relay messages per minute
- Max 10 file transfers per minute
- Exceeding limits -> peer throttled for 60 seconds -> repeated -> peer disconnected

---

## Bootstrap and First Connection

### The "First Peer" Problem

The very first Statik.ai instance has no peers to connect to. This is handled by:

1. **Solo mode:** The system operates fully standalone. All features work except P2P sync.
2. **Second instance joins:**
   - Same device: BroadcastChannel (instant)
   - Same network: mDNS (seconds)
   - Different network: Manual QR/URL exchange
3. **Third+ instance:** Existing mesh provides discovery for new peers automatically

### Connection Lifecycle

```
DISCOVERED  ->  SIGNALING  ->  CONNECTING  ->  CONNECTED  ->  SYNCED
                    |              |              |
                    v              v              v
              FAILED         FAILED         DISCONNECTED
                    |              |              |
                    v              v              v
              RETRY (3x)    RETRY (3x)     RECONNECT
                    |              |              |
                    v              v              v
              UNREACHABLE   UNREACHABLE    OFFLINE
```

---

## External Dependencies

### Required (v0.1)

| Dependency | Purpose | Fallback |
|------------|---------|----------|
| Google STUN servers | ICE candidate gathering for NAT traversal | Cloudflare STUN, or direct LAN connection |
| WebRTC (browser API) | Peer connections and data channels | No fallback (core dependency) |
| WebCrypto (browser API) | Key generation, signing, encryption | No fallback (core dependency) |

### Optional (v0.2+)

| Dependency | Purpose | Fallback |
|------------|---------|----------|
| IPFS node | Internet-wide peer discovery | Manual QR/URL |
| TURN server | Relay for symmetric NAT | Peer-assisted relay |

### Zero External Dependencies After Bootstrap

Once two instances are connected on the same network:
- STUN servers are only needed for NEW connections across NAT
- All communication happens directly via WebRTC
- No server is ever contacted during normal operation

---

## Performance and Limits

### Connection Limits

| Metric | Limit |
|--------|-------|
| Max simultaneous peers | 10 |
| Max data channels per peer | 3 (sync, messages, files) |
| Max message size (messages channel) | 64KB |
| Max file chunk size (files channel) | 64KB |
| Max ISO stream size | 500MB |
| Heartbeat interval | 30 seconds |
| Offline threshold | 2 minutes |
| Reconnect backoff | 5s, 10s, 30s, 60s, 5min |
| Rate limit (sync) | 100 msg/min per peer |
| Rate limit (messages) | 1000 msg/min per peer |

### Bandwidth Estimates

| Operation | Approximate Size |
|-----------|-----------------|
| Heartbeat | ~200 bytes |
| Bus message relay | ~1-5 KB |
| Pattern sync (full) | ~50-200 KB |
| Memory sync (full) | ~1-10 MB |
| ISO transfer (full) | ~5-50 MB |
| File update (single) | ~1-100 KB |
