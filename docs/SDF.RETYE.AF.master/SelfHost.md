# docs/SelfHost.md

## Statik.ai Self-Hosting Architecture

**Version:** 0.1.0
**Last Updated:** March 9, 2026
**Status:** CRITICAL -- Required for system operation

---

## Executive Summary

Statik.ai has NO traditional server infrastructure. The system IS the server. After initial first-load, every instance is fully self-contained and self-hosting through three interlocking mechanisms:

1. **Service Worker as Proxy** -- sw.js intercepts ALL network requests. Serves from cache/OPFS. The browser never hits a "server."
2. **VFS as Local Server** -- The entire source tree lives in OPFS via the Virtual File System. The device has its own copy of everything.
3. **Mesh as Network** -- P2P mesh (mesh.u + disc.u + sync.u) distributes code, state, and updates between instances. No central server needed.

**Distribution format:** `sfti.iso` -- a complete bootable JSON snapshot containing source + state + config.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Bootstrap Distribution](#bootstrap-distribution)
3. [Service Worker as Proxy](#service-worker-as-proxy)
4. [VFS as Local Server](#vfs-as-local-server)
5. [Mesh as Network](#mesh-as-network)
6. [Domain and Name Resolution](#domain-and-name-resolution)
7. [Code Distribution via Mesh](#code-distribution-via-mesh)
8. [Update Propagation](#update-propagation)
9. [New Unit: deploy.u.js](#deploy-unit)
10. [New Unit: dns.u.js](#dns-unit)
11. [Push Notifications](#push-notifications)
12. [First-Install Flow](#first-install-flow)
13. [Self-Hosting Lifecycle](#self-hosting-lifecycle)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         DEVICE (iOS PWA)                        │
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Service      │    │  VFS         │    │  OPFS        │      │
│  │  Worker       │◄──►│  (source     │◄──►│  (38GB+      │      │
│  │  (proxy)      │    │   tree)      │    │   storage)   │      │
│  └──────┬───────┘    └──────────────┘    └──────────────┘      │
│         │                                                        │
│         ▼                                                        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Browser      │    │  Mesh        │    │  IndexedDB   │      │
│  │  Runtime      │◄──►│  (P2P net)   │◄──►│  (state)     │      │
│  │  (19+ units)  │    │              │    │              │      │
│  └──────────────┘    └──────┬───────┘    └──────────────┘      │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │ WebRTC
                               ▼
                     ┌──────────────────┐
                     │  Other Instances  │
                     │  (mesh peers)     │
                     └──────────────────┘
```

**Key principle:** After the first load, the device never needs to contact any external server again. All subsequent operations -- code serving, updates, peer discovery, state sync -- happen through the local SW + VFS + mesh.

---

## Bootstrap Distribution

The bootstrapping problem: how does the FIRST instance get loaded?

### Primary: sfti.iso Distribution

The `sfti.iso` file is a complete, self-bootstrapping JSON snapshot containing:
- All source files (as strings)
- Default configuration
- Default NLP patterns
- Empty state (fresh instance)

**Distribution methods for the ISO:**
- AirDrop between iOS devices
- Shared via messaging (iMessage, Signal, etc.)
- USB transfer
- QR code linking to IPFS CID
- Any temporary static host (GitHub Pages, Netlify, personal server) for initial seed

### Secondary: Minimal Bootstrap HTML

A single `bootstrap.html` file (~5KB) that:
1. Contains an ISO loader
2. Accepts sfti.iso via file input or drag-and-drop
3. Extracts source into OPFS via VFS
4. Registers the Service Worker
5. Reloads as a fully self-hosted PWA

```html
<!-- bootstrap.html (conceptual) -->
<!-- User opens this, drops sfti.iso, system self-installs -->
```

### Tertiary: Mesh Bootstrap

If a device is on the same network as an existing instance:
1. disc.u on existing instance broadcasts presence (mDNS/BroadcastChannel)
2. New device connects via mesh.u
3. Existing instance streams sfti.iso via WebRTC data channel
4. New device self-installs from the streamed ISO

---

## Service Worker as Proxy

The Service Worker (`sw.js`) acts as a local HTTP proxy for ALL requests:

### Request Interception Strategy

```
Request arrives at sw.js fetch handler:
  1. Check SW Cache (static assets, pre-cached at install)
     → HIT: Return cached response
  2. Check OPFS via VFS (source files, dynamic content)
     → HIT: Return constructed Response object
  3. Check IndexedDB (state, config files)
     → HIT: Return as JSON Response
  4. Check mesh peers (if resource not found locally)
     → HIT: Return peer-provided resource, cache locally
  5. MISS: Return offline fallback page
```

### SW as Proxy Key Behaviors

- **Cache-first for static assets** (CSS, icons, fonts)
- **OPFS-first for source files** (VFS stores all JS modules)
- **Never falls back to network** for core system files (fully offline)
- **Mesh fallback** for resources not yet cached (new peer joining)
- **Self-updating**: When VFS writes new source, SW cache is invalidated and repopulated

### SW Update Lifecycle

When the system self-modifies (VFS edit + hot reload):
1. VFS writes updated file to OPFS
2. VFS notifies SW via `postMessage({ type: 'cache-invalidate', paths: [...] })`
3. SW evicts old cached versions of affected files
4. Next fetch for those files reads from updated OPFS
5. No page reload needed (ES module hot reload via loader.js handles runtime)

---

## VFS as Local Server

The Virtual File System (VFS) stores the entire source tree in OPFS:

### VFS Directory Layout in OPFS

```
/vfs/
  ├── index.html
  ├── manifest.json
  ├── sw.js
  ├── file-manifest.json          ← generated from VFS tree
  ├── bootstrap/
  │   ├── boot.js
  │   ├── detect.js
  │   ├── hydrate.js
  │   └── recover.js
  ├── configs/
  │   ├── units.registry.json
  │   ├── capabilities.json
  │   ├── constraints.json
  │   ├── defaults.json
  │   └── nlp-patterns-default.json
  ├── src/
  │   └── ... (entire source tree)
  ├── models/
  │   └── ... (on-device ML models)
  └── assets/
      └── ... (icons, styles, fonts)
```

### VFS as Server Key Behaviors

- `vfs.readFile(path)` serves any file from OPFS
- `file-manifest.json` is auto-generated from VFS tree (lists all files with hashes)
- SW calls `vfs.readFile()` to serve source files
- VFS tracks modifications with version numbers per file
- Entire VFS can be serialized to sfti.iso for distribution

---

## Mesh as Network

The P2P mesh replaces traditional networking:

### Mesh Roles in Self-Hosting

| Traditional Server | CSA.OS Equivalent |
|--------------------|-------------------|
| CDN serves static files | SW + VFS serve from OPFS |
| DNS resolves domain names | dns.u resolves names in mesh |
| Load balancer distributes traffic | Mesh topology auto-balances |
| Database stores state | IndexedDB + OPFS per instance |
| Deploy pipeline pushes updates | deploy.u propagates via mesh |
| Push notification server | Mesh relays push triggers between peers |

### Content Routing via Mesh

When a resource is requested but not found locally:
1. SW broadcasts `mesh.resource.request` with the file path + hash
2. Mesh peers check their VFS for the file
3. First peer with a matching file streams it back via WebRTC data channel
4. Requesting instance caches it in VFS/OPFS
5. Future requests served locally

This enables a fully distributed CDN with zero infrastructure cost.

---

## Domain and Name Resolution

### Mesh-Internal Name Resolution (dns.u)

Traditional DNS cannot be used because the system operates without servers. Instead, dns.u provides mesh-internal name resolution:

**How it works:**
1. Each instance has a unique `instance_id` (generated at first boot)
2. disc.u discovers peers and their `instance_id`s
3. dns.u maintains a local name table: `{ name → instance_id → endpoint }`
4. Names are human-readable aliases (e.g., "statik.ai/phone", "statik.ai/laptop")
5. Resolution is local-first (check own table), then mesh-query (ask peers)

**Domain structure:**
```
statik.ai                    → resolves to local instance
statik.ai/phone              → resolves to phone instance peer ID
statik.ai/laptop             → resolves to laptop instance peer ID
statik.ai/mesh               → resolves to all connected mesh peers
```

### External Reachability (Future)

For instances that need to be reachable from the open internet (beyond local mesh):
- **IPFS gateway**: Content-addressable distribution via IPFS CID
- **Cloudflare Tunnel / ngrok-like**: Tunnel from device to public endpoint (opt-in)
- **Decentralized naming**: Handshake / ENS for permanent decentralized domain registration

These are future enhancements. v0.1 operates within local mesh only.

---

## Code Distribution via Mesh

When a new instance joins the mesh:

### Full Sync Flow

```
New Instance                          Existing Peer
     │                                      │
     ├──[instance.discovered]──────────────►│
     │                                      │
     │◄──[sync.offer { has_iso: true }]─────┤
     │                                      │
     ├──[sync.request { type: 'iso' }]────►│
     │                                      │
     │◄──[data channel: sfti.iso stream]────┤
     │                                      │
     ├──[extract to VFS/OPFS]               │
     │                                      │
     ├──[register SW]                       │
     │                                      │
     ├──[boot from VFS]                     │
     │                                      │
     ├──[sync.complete]───────────────────►│
     │                                      │
```

### Partial Sync Flow

When an existing instance needs specific files (e.g., after a mesh update):

1. deploy.u emits `deploy.update` with changed file list + version vector
2. Receiving instance compares version vectors
3. Requests only the changed files via mesh data channel
4. Writes to VFS/OPFS
5. Triggers SW cache invalidation
6. Hot reloads changed modules via loader.js

---

## Update Propagation

When one instance self-modifies its code:

### Update Flow

1. User edits file in Monaco editor (VFS writes to OPFS)
2. VFS calculates new file hash
3. deploy.u detects the change (subscribes to VFS write events)
4. deploy.u increments the instance's version vector
5. deploy.u emits `deploy.update` to bus
6. mesh.u broadcasts update notification to all connected peers
7. Each peer's deploy.u receives the notification
8. Each peer compares version vectors
9. Peers with older versions request the changed files
10. Files stream via WebRTC data channels
11. Receiving peers write to their VFS/OPFS, invalidate SW cache, hot reload

### Version Consensus

- **Version vectors** (not simple version numbers) track per-instance changes
- **Conflict resolution**: If two instances modify the same file, higher version vector wins. Losing changes preserved as `.conflict` files for manual review.
- **Rollback**: Any instance can revert to a previous sfti.iso snapshot stored in OPFS `/snapshots/`

---

## New Unit: deploy.u.js

**Purpose:** Code distribution, update propagation, version consensus
**Talks To:** bus.u (subscribes 'deploy.received', emits 'deploy.update'), vfs, mesh.u, sync.u

### Functions

- `async init()`:
  - Subscribe to VFS write events
  - Subscribe to `deploy.received` from mesh peers
  - Load version vector from IndexedDB

- `detectChange(filePath, newHash)`:
  - Compare against known file hashes
  - If changed: increment version vector for this instance
  - Emit `deploy.update` with changed files and version vector

- `async propagateUpdate(changedFiles, versionVector)`:
  - Package changed files with metadata
  - Emit to mesh.u for broadcast to connected peers
  - Track which peers have acknowledged receipt

- `async receiveUpdate(update)`:
  - Compare incoming version vector against local
  - Request missing/newer files from the sending peer
  - Write received files to VFS/OPFS
  - Trigger SW cache invalidation
  - Hot reload changed modules

- `resolveConflict(filePath, localVersion, remoteVersion)`:
  - Higher version vector wins
  - Losing version saved as `filePath.conflict`
  - Emit notification to ui.u for user review

### State
- `versionVector`: Map<instanceId, sequenceNumber>
- `pendingUpdates`: Map<peerId, updateMetadata>
- `fileHashes`: Map<filePath, sha256Hash>

### Key Behaviors
- Passive until a VFS write or mesh update occurs
- Bandwidth-efficient: only sends changed files, not full ISO
- Conflict-aware: never silently overwrites divergent changes
- Transactional: all files in an update applied atomically or not at all

---

## New Unit: dns.u.js

**Purpose:** Mesh-internal name resolution, maps human-readable names to peer IDs
**Talks To:** bus.u (subscribes 'dns.resolve', emits 'dns.resolved'), disc.u, mesh.u

### Functions

- `async init()`:
  - Subscribe to `dns.resolve` on bus
  - Load name table from IndexedDB
  - Register own name(s) based on device info

- `resolve(name)`:
  - Check local name table first
  - If not found: broadcast `dns.resolve` query to mesh peers
  - Aggregate responses, return best match
  - Cache result in local table (TTL: 5 minutes)

- `register(name, instanceId, endpoint)`:
  - Add entry to local name table
  - Broadcast registration to mesh peers
  - Peers add to their own tables

- `unregister(name)`:
  - Remove from local table
  - Broadcast removal to mesh

- `getNameTable()`:
  - Return current name → peer mappings
  - Include TTL, last_seen, confidence

### State
- `nameTable`: Map<name, { instanceId, endpoint, lastSeen, ttl }>
- `ownNames`: Array of names this instance is registered under

### Key Behaviors
- Local-first resolution (check own table before querying mesh)
- Automatic discovery: when disc.u finds a new peer, dns.u registers it
- TTL-based expiration: stale entries removed after 5 minutes without heartbeat
- No central authority: every instance maintains its own copy of the name table
- Conflict resolution: if two instances claim the same name, most recent registration wins

---

## Push Notifications

iOS push notifications require a VAPID server endpoint. Without a traditional server, the options are:

### Option A: Mesh-Relayed Push (v0.1)

1. Instance A wants to notify instance B
2. A sends notification via mesh data channel to B
3. B's Service Worker displays the notification locally
4. **Limitation:** Only works when both instances are online and connected

### Option B: Peer-Assisted Push (v0.2)

1. Instance A creates a push trigger
2. Mesh stores the trigger across multiple peers
3. When B comes online and connects to any peer, the trigger is delivered
4. **Limitation:** Requires at least one peer to be online

### Option C: VAPID via Temporary Relay (Future)

1. A lightweight VAPID relay runs as a Cloudflare Worker (free tier)
2. Instances register push subscriptions
3. Relay only stores VAPID keys and subscription endpoints
4. Zero knowledge of message content (encrypted)
5. **Trade-off:** Minimal external dependency for full push support

**v0.1 uses Option A.** Push is best-effort, requiring both peers online.

---

## First-Install Flow

### Flow 1: From sfti.iso File

```
1. User receives sfti.iso (AirDrop, message, USB, QR→IPFS)
2. User opens bootstrap.html in Safari
3. User drops/selects sfti.iso
4. bootstrap.html extracts ISO:
   a. Parse JSON
   b. Write all source files to OPFS via VFS
   c. Write config files
   d. Generate file-manifest.json
   e. Register Service Worker
5. SW caches critical assets
6. Page reloads
7. SW intercepts all requests → serves from OPFS
8. boot.js runs: detect → hydrate → kernel init
9. System is now fully self-hosted
10. "Add to Home Screen" prompt appears
```

### Flow 2: From Existing Peer

```
1. User opens bootstrap.html on same network as existing instance
2. bootstrap.html contains minimal disc.u client
3. Discovers existing instance via mDNS/BroadcastChannel
4. Connects via WebRTC
5. Streams sfti.iso from peer
6. Continues from step 4 of Flow 1
```

### Flow 3: From Temporary Static Host

```
1. Developer serves files from any HTTP server (python3 -m http.server)
2. User opens URL in Safari
3. SW caches all files on first load
4. VFS stores source in OPFS
5. System is now self-hosted, original server no longer needed
6. "Add to Home Screen" prompt appears
```

---

## Self-Hosting Lifecycle

```
BIRTH:        sfti.iso received → extract → install SW → boot → self-hosted
OPERATION:    SW serves all requests from OPFS/cache → fully offline capable
LEARNING:     delta learning updates patterns → stored in IndexedDB → persists
SELF-MODIFY:  User edits code in Monaco → VFS writes to OPFS → hot reload
PROPAGATE:    deploy.u broadcasts changes → mesh distributes to peers
SYNC:         sync.u synchronizes memory/patterns/goals between instances
SNAPSHOT:     hc.u creates sfti.iso snapshot every 30min → OPFS /snapshots/
DISTRIBUTE:   Share sfti.iso with new users → they become new self-hosted instances
DEATH:        iOS 7-day eviction → storage cleared → mesh peers preserve state
REBIRTH:      User reopens → mesh peers restore state → system resumes
```

The system is designed to be immortal through the mesh. Even if one instance dies, the mesh preserves its state and code, ready to restore when the instance comes back online.
