# Statik.ai – iOS Integration Guide

## Target Device

iPhone 16 Pro running iOS 26.3 Developer Beta:
- **Chip**: A18 Pro (3nm, 6-core CPU)
- **RAM**: 8 GB
- **Storage**: Varies (OPFS quota up to several GB)

## Developer Mode Features

Enable in **Settings → Developer** to unlock:

| Feature | API | Use in Statik.ai |
|---------|-----|-------------------|
| OPFS | `navigator.storage.getDirectory()` | Large file persistence, VFS backing |
| WebGPU | `navigator.gpu` | Vector similarity, batch compute |
| SharedArrayBuffer | `SharedArrayBuffer` | Worker shared memory |
| Extended Storage | `navigator.storage.persist()` | Prevent eviction |
| Background Sync | `ServiceWorkerRegistration.sync` | Offline data updates |

## Safari Experimental Features

Enable in **Settings → Safari → Advanced → Experimental Features**:
- WebGPU
- SharedArrayBuffer
- OPFS
- WebAssembly Threads

## PWA Installation

1. Open Statik.ai URL in Safari
2. Tap **Share → Add to Home Screen**
3. App runs in standalone mode (no browser chrome)

### Manifest Capabilities
- Standalone display mode
- Portrait orientation
- Shortcuts (Quick Entry, Memory)
- File handlers (JSON, CSV import)
- Share target (receive shared content)

## Hardware Access

### Camera (`src/adapters/ios/hardware.adapter.js`)
- `getUserMedia()` for camera/mic access
- Use for OCR, document scanning

### Sensors
- `DeviceMotionEvent` – accelerometer, gyroscope
- `AmbientLightSensor` – light level
- `Geolocation` – position tracking

### Haptics
- `navigator.vibrate()` – tactile feedback patterns
- Success: `[50]`, Error: `[100, 50, 100]`, Alert: `[200]`

## Background Execution

The Service Worker enables:
- **Cache-first** serving for offline use
- **Background Fetch** for large downloads
- **Periodic Sync** for data updates while app is closed

## Storage Quotas

iOS Safari provides generous quotas for PWAs:
- IndexedDB: typically 1+ GB
- OPFS: device storage dependent
- Cache API: included in overall quota

Monitor usage via `navigator.storage.estimate()`.

## Constraints

- No push notifications without user gesture
- Background execution limited to Service Worker events
- WebGPU support varies by iOS version
- No sideloading without AltStore or similar
