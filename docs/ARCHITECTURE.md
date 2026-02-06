# Statik.ai – Architecture Overview

> **CSA.OS** – Client-Side Agent Operating System  
> Zero dependencies · Fully sovereign · Edge-first

See `docs/sfti.ai.MILESTONE.md` for the complete operating blueprint.

## Directory Map

| Path | Purpose |
|------|---------|
| `bootstrap/` | Cold start, capability detection, state rehydration |
| `configs/` | System configuration and feature flags |
| `schemas/` | Message, storage, and state validation schemas |
| `src/kernel/` | Core orchestration and lifecycle |
| `src/bus/` | Pub/sub message infrastructure |
| `src/runtime/` | Scheduling, allocation, throttling |
| `src/units/` | Cognitive units (perception, memory, NLP, etc.) |
| `src/workers/` | Web Workers for off-thread compute |
| `src/adapters/` | Platform-specific integrations (iOS, web, universal) |
| `src/storage/` | IndexedDB, OPFS, cache persistence |
| `src/vfs/` | Virtual file system for self-hosting |
| `src/protocols/` | Inter-unit communication (RPC, streams, events) |
| `src/ui/` | Shell, chat, inspector, editor, controls |
| `src/utils/` | Shared helpers (ID, time, math, crypto, logging) |
| `assets/` | Icons, styles, fonts |
| `tests/` | Unit, integration, and e2e tests |
| `docs/` | API, boot sequence, messages, storage, iOS docs |

## Boot Sequence

1. **DETECT** – enumerate browser/device capabilities  
2. **INITIALIZE** – load kernel, bus, spawn workers  
3. **HYDRATE** – restore persisted state or init fresh  
4. **WAKE** – start units in dependency order  
5. **READY** – emit `system.ready`, enable UI  

## Principles

- **No third-party dependencies** – every byte is ours.  
- **Offline-first** – Service Worker caches everything.  
- **Privacy-by-default** – all data stays on-device.  
- **Self-modifiable** – VFS + Monaco lets the system edit itself.
