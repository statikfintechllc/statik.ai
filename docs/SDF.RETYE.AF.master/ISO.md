## ISO GENERATION

### **sfti.iso**
**Purpose:** Self-contained system snapshot (bootable from any server)  
**Specification:**
- **Format:** JSON file (not actual ISO filesystem, just naming convention)
- **Contents:**
  ```json
  {
    "meta": {
      "version": "0.1.0",
      "created_at": "2026-02-07T12:34:56Z",
      "instance_id": "statik_phone_abc123",
      "hash": "sha256:abc123...",
      "size_mb": 15.3
    },
    "source": {
      "index.html": "<!DOCTYPE html>...",
      "manifest.json": "{...}",
      "sw.js": "self.addEventListener...",
      "src/kernel/kernel.u.js": "export class Kernel {...}",
      // ... ALL source files as strings
    },
    "state": {
      "memories": [...],
      "patterns": {...},
      "skills": [...],
      "unit_states": {...},
      "kernel_state": {...}
    },
    "config": {
      "autonomy_level": "low",
      "theme": "dark",
      // ... all configs
    }
  }
  ```
- **Generation script:** `src/vfs/snapshot.js` (already specified)
- **Trigger:**
  - Auto: Every 30 minutes (configurable)
  - Manual: Export button in UI
  - Event: Before major changes (self-modification)
- **Storage:**
  - Save to OPFS: `/snapshots/statik-${timestamp}.iso`
  - Keep last 5 snapshots (delete older)
  - Offer download via `<a download>`
- **Restore:**
  - Upload .iso file
  - Validate hash
  - Overwrite current system
  - Reboot

**Auto-generation implementation:**
```javascript
// Triggered by hc.u every 30 minutes
setInterval(async () => {
  const snapshot = await createSnapshot();
  await saveToOPFS('/snapshots/latest.iso', snapshot);
  await pruneOldSnapshots(keepLast=5);
}, 30 * 60 * 1000); // 30 minutes
```

---

### Distribution via Mesh

sfti.iso is the primary distribution format for new instances:

1. **Peer-to-peer distribution:** Existing instances share sfti.iso via WebRTC data channels (mesh.u)
2. **Chunked transfer:** ISO files are split into 64KB chunks for reliable transfer (see P2P.md)
3. **Integrity verification:** SHA-256 hash verified after transfer, before extraction
4. **Progressive loading:** For large ISOs, source files extract first (boot capability), state loads second

### ISO Contents (Updated)

The ISO now includes:
- `source`: All source files including new units (deploy.u, dns.u) and inference.worker.js
- `models`: On-device ML model files (optional, can be synced separately)
- `state`: memories, patterns, skills, unit_states, kernel_state
- `config`: All configurations including nlp-patterns-default.json
- `file-manifest.json`: Complete file listing with integrity hashes