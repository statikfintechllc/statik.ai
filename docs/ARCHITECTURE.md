# Statik.ai – Architecture Overview

> **CSA.OS** – Client-Side Agent Operating System  
> Zero dependencies · Fully sovereign · Edge-first

See `docs/sfti.ai.MILESTONE.md` for the complete operating blueprint.  
See `docs/Chat.w.Claude.md` for the multi-instance, self-hosting, and decentralised DNS extensions.

## Directory Map

| Path | Purpose |
|------|---------|
| `bootstrap/` | Cold start, capability detection, state rehydration |
| `configs/` | System configuration, feature flags, deployment config |
| `schemas/` | Message, storage, and state validation schemas |
| `src/kernel/` | Core orchestration and lifecycle |
| `src/bus/` | Pub/sub message infrastructure |
| `src/runtime/` | Scheduling, allocation, throttling |
| `src/units/` | Cognitive units (21 total – see below) |
| `src/workers/` | Web Workers for off-thread compute |
| `src/adapters/ios/` | iOS hardware, OPFS storage, network, permissions |
| `src/adapters/web/` | WebGPU, IndexedDB, notifications |
| `src/adapters/universal/` | WebCrypto, performance timing |
| `src/adapters/server/` | Self-hosting: iSH, Node.js, SW proxy |
| `src/adapters/network/` | P2P: WebRTC mesh, mDNS, IPFS, Nostr |
| `src/storage/` | IndexedDB, OPFS, cache persistence |
| `src/vfs/` | Virtual file system for self-hosting |
| `src/protocols/` | RPC, streams, events, discovery, sync, relay |
| `src/ui/` | Shell, chat, inspector, editor, controls |
| `src/utils/` | Shared helpers (ID, time, math, crypto, logging) |
| `assets/` | Icons, styles, fonts |
| `tests/` | Unit, integration, and e2e tests |
| `docs/` | API, boot sequence, messages, storage, iOS docs |

## Units (21)

### Core Cognitive (Phase 1–3)
`pce.u` → `as.u` → `ti.u` → `cm.u` → `nlp.u` → `gm.u` → `ee.u` → `dbt.u` → `sa.u` → `ie.u` → `ec.u` → `hc.u`

### Interface & Tooling (Phase 1–4)
`ui.u` · `telemetry.u` · `dev.u` · `sync.u`

### Federation & Deployment (Phase 5)
`disc.u` (discovery) · `mesh.u` (P2P mesh) · `bridge.u` (debug bridge) · `deploy.u` (self-deployment) · `dns.u` (decentralised naming)

## Boot Sequence

1. **DETECT** – enumerate browser/device capabilities  
2. **INITIALIZE** – load kernel, bus, spawn workers  
3. **HYDRATE** – restore persisted state or init fresh  
4. **WAKE** – start units in dependency order  
5. **READY** – emit `system.ready`, enable UI  

## Multi-Instance Architecture

Statik.ai instances can discover, connect, and sync with each other:

1. **Discovery** (`disc.u`) – BroadcastChannel (same-origin), mDNS (local network), IPFS/Nostr (remote)  
2. **Mesh** (`mesh.u`) – WebRTC data channels for P2P communication  
3. **Bridge** (`bridge.u`) – WebSocket debug stream to external tools (Gemini, laptop)  
4. **Deploy** (`deploy.u`) – Self-deploy to GitHub Pages, IPFS, or export as bundle  
5. **DNS** (`dns.u`) – ENS, Handshake, IPFS, Nostr NIP-05, mDNS (.local)  

## Self-Hosting

| Environment | Adapter | Access |
|-------------|---------|--------|
| iSH on iPhone | `server/ish.adapter.js` | `http://localhost:8080` |
| Node.js | `server/node.adapter.js` | `http://localhost:8080` |
| Browser-only | `server/sw.proxy.js` | Service Worker serves from cache/OPFS |
| GitHub Pages | `deploy.u.js` | `https://user.github.io/statik-ai` |

## Principles

- **No third-party dependencies** – every byte is ours.  
- **Offline-first** – Service Worker caches everything.  
- **Privacy-by-default** – all data stays on-device.  
- **Self-modifiable** – VFS + Monaco lets the system edit itself.  
- **Federated** – instances sync and delegate across devices.
