# docs/Security.md

## Statik.ai Security Model

**Version:** 0.1.0
**Last Updated:** March 9, 2026
**Status:** HIGH PRIORITY -- Consolidated security specification

---

## Executive Summary

This document consolidates all security requirements that were previously scattered across Units.md (ec.u), API.md (section 14), STORAGE.md (encryption), and P2P.md (mesh security). It is the single source of truth for the security posture of the CSA.OS.

**Security philosophy:**
- **Defense in depth:** Multiple layers of protection
- **Zero trust:** Every peer connection must be authenticated and encrypted
- **Least privilege:** Units can only access what they need
- **Immutable audit trail:** All security events logged to append-only delta log
- **Fail secure:** On error, deny access rather than grant it

---

## Table of Contents

1. [Threat Model](#threat-model)
2. [Peer Identity and Authentication](#peer-identity-and-authentication)
3. [Mandatory Encryption](#mandatory-encryption)
4. [Content Security Policy](#content-security-policy)
5. [Ethics and Constraints (ec.u)](#ethics-and-constraints)
6. [Code Signing and Integrity](#code-signing-and-integrity)
7. [Storage Security](#storage-security)
8. [P2P Security](#p2p-security)
9. [Debug Bridge Security](#debug-bridge-security)
10. [Self-Modification Security](#self-modification-security)
11. [Rate Limiting](#rate-limiting)
12. [Audit and Logging](#audit-and-logging)

---

## Threat Model

### Assets to Protect

| Asset | Sensitivity | Storage |
|-------|------------|---------|
| User memories (episodic) | HIGH | IndexedDB |
| Learned patterns | MEDIUM | IndexedDB |
| Source code (VFS) | MEDIUM | OPFS |
| Private keys | CRITICAL | IndexedDB (non-extractable) |
| Configuration | LOW | OPFS |
| Conversation history | HIGH | IndexedDB |

### Threat Actors

| Actor | Capability | Motivation |
|-------|-----------|------------|
| Malicious mesh peer | Network access, crafted messages | Data exfiltration, code injection |
| Local attacker | Physical device access | Data theft |
| XSS attacker | JavaScript injection via user input | Session hijacking, data theft |
| MITM attacker | Network interception | Eavesdropping, message tampering |
| Rogue self-modification | Compromised VFS edit | Persistent code backdoor |

### Attack Surfaces

1. **User input** (chat interface) → XSS, command injection
2. **Mesh network** (WebRTC data channels) → malicious peers, data injection
3. **Self-modification** (VFS + hot reload) → code injection
4. **Debug bridge** (HTTP polling) → unauthorized remote control
5. **Service Worker** (fetch interception) → cache poisoning
6. **IndexedDB** (unencrypted by default) → local data theft

---

## Peer Identity and Authentication

### Key Generation (First Boot)

```javascript
// RSA-4096 key pair generated once, stored permanently
const keyPair = await crypto.subtle.generateKey(
  {
    name: 'RSA-OAEP',
    modulusLength: 4096,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256'
  },
  false,  // non-extractable private key
  ['encrypt', 'decrypt']
);

// Separate signing key pair
const signingKeyPair = await crypto.subtle.generateKey(
  {
    name: 'RSA-PSS',
    modulusLength: 4096,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: 'SHA-256'
  },
  false,
  ['sign', 'verify']
);
```

### Instance Identity

- **Instance ID** = first 16 chars of SHA-256(public key)
- **Fingerprint** = full SHA-256 of public key (displayed as hex pairs: `ab:cd:ef:...`)
- Private key NEVER leaves the device (WebCrypto `extractable: false`)

### Authentication Handshake

When two peers connect via WebRTC:
```
A → B: { type: 'auth.hello', instance_id, public_key, nonce }
B → A: { type: 'auth.challenge', signed_nonce: sign(A.nonce, B.privateKey), public_key, nonce }
A → B: { type: 'auth.response', signed_nonce: sign(B.nonce, A.privateKey) }
Both: Verify signatures against received public keys
Both: Derive shared session key via ECDH or RSA-OAEP key exchange
```

### Trust Levels

| Level | Criteria | Permissions |
|-------|----------|-------------|
| `unknown` | First contact, unverified | Can exchange public info only |
| `verified` | User confirmed fingerprint match | Can sync patterns, receive code updates |
| `trusted` | Verified + 7 days successful sync | Full sync including memories, goal distribution |

---

## Mandatory Encryption

### In-Transit Encryption

ALL data transmitted between instances MUST be encrypted. This is NOT optional.

- **WebRTC DTLS:** Built-in transport encryption for data channels (always on)
- **Application-layer E2E:** Additionally, all message payloads are encrypted with the recipient's public key before sending
- **Double encryption:** DTLS protects the transport, E2E protects the content (even from STUN/TURN servers)

### At-Rest Encryption

All sensitive data in IndexedDB MUST be encrypted:
```javascript
// Per-instance encryption key, derived from instance private key
const storageKey = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt: instanceSalt, iterations: 100000, hash: 'SHA-256' },
  masterKey,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt', 'decrypt']
);
```

**Per-instance salt:** Generated randomly at first boot, stored alongside key material. NOT hardcoded. (This fixes the previous `'statik-salt'` hardcoded value in STORAGE.md.)

### What Must Be Encrypted At Rest

| Store | Encrypted | Reason |
|-------|-----------|--------|
| episodic memories | YES | Contains user conversations |
| semantic concepts | YES | May contain sensitive knowledge |
| procedural skills | NO | Generic procedures, low sensitivity |
| patterns | NO | Regex patterns, low sensitivity |
| deltas (learning log) | YES | Contains interaction history |
| unit state | NO | Technical state, low sensitivity |
| kernel state | NO | Boot counts, uptime, low sensitivity |
| private keys | YES (by WebCrypto) | Non-extractable CryptoKey objects |

---

## Content Security Policy

The `index.html` MUST include a strict CSP:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  connect-src 'self' wss: stun: turn:;
  worker-src 'self' blob:;
  child-src 'self' blob:;
  font-src 'self';
  frame-src 'none';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
">
```

**Key restrictions:**
- No inline scripts (`script-src 'self'` only)
- No external script loading (Monaco editor loaded from OPFS after first cache)
- WebSocket/STUN/TURN connections allowed for P2P
- Blob URLs allowed for Worker creation
- No frames, no objects, no plugins

### Subresource Integrity (SRI)

For any CDN-loaded resources (Monaco editor on first load before OPFS cache):
```html
<script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js"
  integrity="sha384-[hash]"
  crossorigin="anonymous"></script>
```

After first load, Monaco is cached in OPFS and served from VFS. CDN is never contacted again.

---

## Ethics and Constraints (ec.u)

### Immutable Hard Rules

These rules are enforced by ec.u and CANNOT be overridden, even by dev.u or self-modification:

| Rule | Description | Enforcement |
|------|-------------|-------------|
| `no_blind_storage` | Never store data without user awareness | Block action, log violation |
| `no_unknown_network` | Never make network calls to unknown endpoints | Block action, log violation |
| `no_arbitrary_code` | Never execute unvalidated code from peers | Block action, log violation |
| `no_impersonation` | Never claim to be human or another system | Block action, log violation |
| `no_capability_lies` | Never claim capabilities the system doesn't have | Block action, log violation |
| `no_private_key_export` | Never export or transmit private keys | Block action, escalate to safe mode |
| `no_unencrypted_sync` | Never sync data over unencrypted channels | Block action, log violation |

### Violation Logging

All constraint violations are:
1. Logged permanently to `statik_logs.violations` (append-only)
2. Include: timestamp, rule violated, unit that attempted, action that was blocked
3. NEVER deleted, even during memory cleanup
4. Accessible in UI inspector for user review

---

## Code Signing and Integrity

### VFS Code Signing

When any file is written to VFS (either by self-modification or mesh sync):

1. Calculate SHA-256 hash of the new content
2. Sign the hash with the instance's signing key
3. Store signature alongside the file in OPFS
4. On every file load, verify signature against stored hash
5. If verification fails: refuse to load, emit `error.detected` with severity 10, offer rollback

### File Integrity Manifest

`file-manifest.json` contains:
```json
{
  "files": {
    "src/units/nlp.u.js": {
      "hash": "sha256:abc123...",
      "signature": "base64:...",
      "signer": "instance_id",
      "modified": 1710000000000,
      "version": 42
    }
  },
  "manifest_hash": "sha256:xyz789...",
  "manifest_signature": "base64:..."
}
```

### Mesh Code Verification

When receiving code from a peer:
1. Verify the sender's signature on each file
2. Verify the sender is a `verified` or `trusted` peer
3. Validate JavaScript syntax before writing to VFS
4. Create sfti.iso snapshot BEFORE applying any changes
5. Apply changes
6. Re-sign files with own signing key
7. If any validation fails: reject entire update, notify user

---

## Storage Security

### IndexedDB Access Control

- All IndexedDB databases are origin-isolated by the browser
- Additional encryption layer via WebCrypto AES-GCM
- Encryption keys derived from instance master key (PBKDF2)
- Per-instance random salt (NOT hardcoded)

### OPFS Security

- OPFS is origin-private (only this PWA can access)
- Source files signed with code signing keys
- Snapshot ISOs include integrity hashes
- Private keys stored as non-extractable CryptoKey objects

### 7-Day Eviction Mitigation

iOS may evict all storage if PWA not opened for 7 days:
1. Mesh peers cache the instance's critical state
2. On re-open, mesh peers restore state via sync
3. hc.u creates frequent snapshots (every 30 min) distributed to peers
4. User prompted to add to Home Screen (reduces eviction likelihood)
5. Push notifications remind user to open PWA periodically

---

## P2P Security

### Peer Rate Limiting

| Operation | Limit | On Exceed |
|-----------|-------|-----------|
| Sync messages | 100/min per peer | Throttle 60s |
| Bus relay messages | 1000/min per peer | Throttle 60s |
| File transfers | 10/min per peer | Throttle 60s |
| Connection attempts | 5/min per peer | Ban 5 minutes |
| Repeated violations | 3 throttles in 10min | Disconnect + ban 1 hour |

### Malicious Peer Detection

- Peers sending invalid signatures → immediate disconnect
- Peers sending malformed messages → 3 strikes then disconnect
- Peers requesting data above their trust level → deny + log
- Peers flooding with data → rate limit + throttle

### Data Filtering

Before accepting any synced data:
1. Validate against JSON schema
2. Check size limits (no single memory >1MB, no pattern >100KB)
3. Sanitize any HTML/script content in memories
4. Check for known malicious patterns (e.g., `<script>`, `javascript:`, `eval(`)
5. Run through ec.u constraint validation

---

## Debug Bridge Security

### Current State (v0.1)

bridge.u uses HTTP polling to a Python debug server on the local network. Current authentication: NONE.

### Required Security (v0.1 fix)

1. **Shared secret:** bridge.u and the debug server must share a pre-configured secret token
2. **Token validation:** Every command from the server must include the token in headers
3. **Commands signed:** Debug commands include HMAC signature using shared secret
4. **LAN-only:** bridge.u MUST verify the debug server is on the same local network (check IP range)
5. **Manual activation:** bridge.u is only active when `?dev=true` AND user has explicitly enabled debugging in settings
6. **Command allowlist:** Only allow specific commands (reload, screenshot, eval, getState, click, type, scroll, test). Reject all others.
7. **Eval sandboxing:** `eval` commands run in a Worker context, not on the main thread

---

## Self-Modification Security

When the system modifies its own code (via Monaco editor or autonomous self-modification):

### Pre-Modification

1. Create mandatory sfti.iso snapshot (stored in OPFS `/snapshots/`)
2. Keep last 5 snapshots minimum (never delete below 5)

### Validation

1. Parse JavaScript with `new Function()` to verify syntax
2. Check for prohibited patterns:
   - `eval()` calls outside Worker context
   - `document.write()`
   - External URL fetches (only mesh/VFS allowed)
   - Private key access attempts
   - Direct IndexedDB access (must go through storage layer)
3. Run through ec.u constraint validation
4. Size check: modified file must be <1MB

### Post-Modification

1. Calculate new file hash
2. Sign with instance signing key
3. Update file-manifest.json
4. Test in Worker sandbox: import module, verify it exports expected interface
5. If sandbox fails: roll back to pre-modification snapshot
6. If sandbox passes: hot reload on main thread with error boundary
7. If main thread throws: catch, roll back, notify user

### Autonomous Self-Modification

If the system modifies its own code autonomously (via gm.u exploratory goals):
- All autonomous modifications MUST be approved by sa.u (self-awareness) first
- sa.u checks if the modification is within known safe boundaries
- If uncertain: queue for user approval rather than auto-apply
- All autonomous modifications tagged in delta log with `source: 'autonomous'`
- User can disable autonomous self-modification entirely in settings

---

## Rate Limiting

### Per-Unit Bus Rate Limits

| Unit | Max Messages/sec | On Exceed |
|------|-----------------|-----------|
| pce.u (input processing) | 50 | Queue, drop oldest |
| nlp.u (NLP) | 20 | Queue |
| cm.u (memory) | 100 | Queue |
| dbt.u (learning) | 10 | Queue |
| mesh.u (networking) | 200 | Throttle |
| telemetry.u (logging) | 500 | Drop low-priority |
| All others | 50 | Queue |

### Global Rate Limits

| Resource | Limit |
|----------|-------|
| Total bus messages/sec | 1000 |
| IndexedDB writes/sec | 100 |
| OPFS writes/sec | 50 |
| WebRTC data channel sends/sec | 200 per peer |

---

## Audit and Logging

### Security Events Always Logged

| Event | Severity | Store |
|-------|----------|-------|
| Constraint violation | CRITICAL | statik_logs.violations (permanent) |
| Peer authentication failure | HIGH | statik_logs.security |
| Invalid message signature | HIGH | statik_logs.security |
| Rate limit exceeded | MEDIUM | statik_logs.security |
| Code modification | MEDIUM | statik_logs.security |
| Peer connected/disconnected | LOW | statik_logs.security |
| Debug bridge command | LOW | statik_logs.security |

### Log Retention

- `violations`: PERMANENT (never deleted)
- `security`: 30 days rolling retention
- `actions`: 7 days rolling retention

### User Access

All security logs are viewable in the UI inspector (security tab). Users can:
- View all constraint violations
- See connected peers and their trust levels
- Review code modifications
- Export security logs for analysis
