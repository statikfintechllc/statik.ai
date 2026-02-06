# Statik.ai – Storage Architecture

## Overview

Three persistence layers, all on-device:

| Layer | Technology | Purpose |
|-------|-----------|---------|
| IndexedDB | Browser built-in | Structured data (memories, state, logs) |
| OPFS | Origin Private File System | Large files (snapshots, datasets, VFS) |
| Cache API | Service Worker | Static assets (HTML, CSS, JS, fonts) |

## IndexedDB Databases

### `statik_memory` (v1)
| Store | Key | Fields |
|-------|-----|--------|
| `episodes` | `id` | timestamp, context, salience, tags[] |
| `concepts` | `id` | name, definition, relations[], confidence |
| `skills` | `id` | name, procedure[], success_rate, last_used |

### `statik_state` (v1)
| Store | Key | Fields |
|-------|-----|--------|
| `unit_states` | `unit_id` | state_data, last_updated |
| `kernel_state` | `boot_count` | uptime, crashes[], version |

### `statik_logs` (v1)
| Store | Key | Fields |
|-------|-----|--------|
| `deltas` | `timestamp` | type, before, after, evidence |
| `errors` | `timestamp` | unit, error, context, stack |
| `actions` | `timestamp` | intent, action, outcome |

## OPFS Layout

```
/
├─ snapshots/         # System state snapshots
├─ datasets/          # Trading patterns, market data
└─ monaco/            # VFS-backed source files
```

## Migrations

`src/storage/migrations.js` handles schema upgrades between versions.
Each migration specifies `from` and `to` versions and a `migrate()` function.

## Backup & Restore

`src/storage/backup.js` provides:
- `exportState()` → JSON snapshot of all databases
- `importState(snapshot)` → restore from snapshot

## Quotas

Managed by `src/runtime/quota.js`:
- **Warn** at 80% capacity
- **Critical** at 95% capacity
- Triggers memory pruning via `hc.u`
