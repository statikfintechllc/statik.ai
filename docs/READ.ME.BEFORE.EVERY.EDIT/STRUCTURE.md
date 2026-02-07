## The StatikFinTech Intelligence Operating System Structure

```txt
Statik.ai/
│
├─ index.html
├─ manifest.json
├─ sw.js
├─ README.md
├─ ARCHITECTURE.md
│
├─ bootstrap/
│  ├─ boot.js
│  ├─ detect.js
│  ├─ hydrate.js
│  └─ recover.js
│
├─ configs/
│  ├─ units.registry.json
│  ├─ capabilities.json
│  ├─ constraints.json
│  └─ defaults.json
│
├─ schemas/
│  ├─ messages/
│  │  ├─ context.schema.json
│  │  ├─ intent.schema.json
│  │  ├─ memory.schema.json
│  │  └─ action.schema.json
│  ├─ storage/
│  │  ├─ episodes.schema.json
│  │  ├─ concepts.schema.json
│  │  └─ skills.schema.json
│  └─ state/
│     ├─ unit.state.schema.json
│     └─ kernel.state.schema.json
│
├─ src/
│  ├─ kernel/
│  │  ├─ kernel.u.js
│  │  ├─ lifecycle.js
│  │  ├─ registry.js
│  │  └─ watchdog.js
│  │
│  ├─ bus/
│  │  ├─ bus.u.js
│  │  ├─ channels.js
│  │  ├─ router.js
│  │  └─ validator.js
│  │
│  ├─ runtime/
│  │  ├─ scheduler.js
│  │  ├─ allocator.js
│  │  ├─ quota.js
│  │  └─ throttle.js
│  │
│  ├─ units/
│  │  ├─ pce.u.js
│  │  ├─ as.u.js
│  │  ├─ ti.u.js
│  │  ├─ gm.u.js
│  │  ├─ nlp.u.js
│  │  ├─ cm.u.js
│  │  ├─ dbt.u.js
│  │  ├─ ee.u.js
│  │  ├─ sa.u.js
│  │  ├─ ie.u.js
│  │  ├─ ec.u.js
│  │  ├─ hc.u.js
│  │  ├─ sync.u.js
│  │  ├─ ui.u.js
│  │  ├─ telemetry.u.js
│  │  ├─ dev.u.js
│  │  ├─ bridge.u.js
│  │  ├─ disc.u.js
│  │  └─ mesh.u.js
│  │
│  ├─ workers/
│  │  ├─ cognition.worker.js
│  │  ├─ memory.worker.js
│  │  ├─ nlp.worker.js
│  │  └─ compute.worker.js
│  │
│  ├─ adapters/
│  │  ├─ ios/
│  │  │  ├─ hardware.adapter.js
│  │  │  ├─ storage.adapter.js
│  │  │  ├─ network.adapter.js
│  │  │  └─ permissions.adapter.js
│  │  ├─ web/
│  │  │  ├─ webgpu.adapter.js
│  │  │  ├─ indexeddb.adapter.js
│  │  │  └─ notifications.adapter.js
│  │  └─ universal/
│  │     ├─ crypto.adapter.js
│  │     └─ time.adapter.js
│  │
│  ├─ storage/
│  │  ├─ db.js
│  │  ├─ migrations.js
│  │  ├─ backup.js
│  │  ├─ opfs.js
│  │  └─ cache.js
│  │
│  ├─ vfs/
│  │  ├─ vfs.js
│  │  ├─ tree.js
│  │  ├─ editor.js
│  │  ├─ loader.js
│  │  └─ snapshot.js
│  │
│  ├─ protocols/
│  │  ├─ rpc.js
│  │  ├─ stream.js
│  │  ├─ event.js
│  │  └─ handshake.js
│  │
│  ├─ ui/
│  │  ├─ shell.js
│  │  ├─ chat.js
│  │  ├─ inspector/
│  │  │  ├─ memory.inspector.js
│  │  │  ├─ goals.inspector.js
│  │  │  ├─ trace.inspector.js
│  │  │  └─ performance.inspector.js
│  │  ├─ editor/
│  │  │  ├─ monaco.loader.js
│  │  │  └─ file.browser.js
│  │  └─ controls/
│  │     ├─ pause.js
│  │     ├─ reset.js
│  │     └─ export.js
│  │
│  └─ utils/
│     ├─ id.js
│     ├─ time.js
│     ├─ math.js
│     ├─ hash.js
│     ├─ validate.js
│     ├─ logger.js
│     └─ crypto.js
│
├─ assets/
│  ├─ icons/
│  ├─ styles/
│  │  ├─ base.css
│  │  ├─ chat.css
│  │  └─ inspector.css
│  └─ fonts/
│
├─ tests/
│  ├─ unit/
│  ├─ integration/
│  └─ e2e/
│
├─ docs/
│  ├─ API.md
│  ├─ BOOT.md
│  ├─ MESSAGES.md
│  ├─ STORAGE.md
│  └─ IOS.md
│
└─ sfti.iso
```
