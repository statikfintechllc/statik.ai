# Statik.ai – Boot Sequence

## Overview

The system boots in five sequential phases. If any phase fails,
`bootstrap/recover.js` enters **safe mode**.

## Phases

### 1. DETECT (`bootstrap/detect.js`)
- Enumerate browser and device capabilities
- Detect APIs: WebGPU, OPFS, SharedArrayBuffer, Service Worker
- Measure storage quota and hardware (cores, memory)
- Persist results for runtime decisions

### 2. INIT (`src/kernel/kernel.u.js`)
- Create the message bus (`Bus`)
- Create the unit registry (`Registry`)
- Create the lifecycle manager (`Lifecycle`)
- Spawn web workers (cognition, memory, NLP, compute)
- Load unit manifest from `configs/units.registry.json`

### 3. HYDRATE (`bootstrap/hydrate.js`)
- Check IndexedDB for existing `statik_state`
- If found → restore kernel state and unit states
- If not → initialise fresh state from `configs/defaults.json`

### 4. WAKE (`src/kernel/lifecycle.js`)
- Start units in dependency order:
  `pce → as → ti → cm → nlp → gm → ee → dbt → sa → ie → ec → hc → ui`
- Each unit emits `unit.ready` via the bus
- Kernel waits for all units before proceeding

### 5. READY (`src/kernel/kernel.u.js`)
- Emit `system.ready` event
- UI becomes interactive
- Background tasks begin (memory consolidation, telemetry)

## Error Recovery

| Scenario | Action |
|----------|--------|
| Phase failure | Enter safe mode (minimal UI) |
| Unit crash | Watchdog detects via missing heartbeat, restarts unit |
| Storage corruption | Offer reset or restore from backup |

## Safe Mode

Renders a minimal UI with:
- Error description
- Reset button (clears all state)
- Restore button (load from sfti.iso backup)
