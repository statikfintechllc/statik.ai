# docs/IOS.md

## Statik.ai iOS Integration Documentation

**Version:** 0.1.0  
**Last Updated:** February 8, 2026  
**Target iOS:** 26.3 Developer Beta and later

---

## Executive Summary

Statik.ai is a **Progressive Web App (PWA)** running in Safari/WebKit on iOS. This document covers iOS-specific capabilities, limitations, workarounds, and optimization strategies for iOS 26.3+.

**Critical Reality Check:**
- ✅ PWAs on iOS CAN: Run offline, use OPFS storage, send push notifications (if added to home screen), access sensors
- ❌ PWAs on iOS CANNOT: Create native widgets, run true background processes, deeply integrate with other apps, use Shortcuts natively

---

## Table of Contents

1. [iOS 26 Overview](#ios-26-overview)
2. [PWA Capabilities on iOS](#pwa-capabilities-on-ios)
3. [Storage: OPFS vs IndexedDB](#storage-opfs-vs-indexeddb)
4. [Background Processing](#background-processing)
5. [Push Notifications](#push-notifications)
6. [Widgets (Limitations)](#widgets-limitations)
7. [Hardware Access](#hardware-access)
8. [App Integration](#app-integration)
9. [Installation & Distribution](#installation--distribution)
10. [Performance Optimization](#performance-optimization)
11. [Workarounds & Alternatives](#workarounds--alternatives)
12. [Testing & Debugging](#testing--debugging)

---

## iOS 26 Overview

### Version History

**iOS Versioning Change (2025):**
- Apple jumped from iOS 18 (2024) → iOS 26 (2025)
- Skipped iOS 19-25 to align with calendar year
- All Apple OSes now use same number (iOS 26, macOS 26, watchOS 26, etc.)

**Current Versions (Feb 2026):**
- **Stable:** iOS 26.2.1 (released January 2026)
- **Beta:** iOS 26.3 Developer Beta 3 (build 23D5114d)
- **Next:** iOS 26.4 expected March/April 2026

### iOS 26 Key Features

**Liquid Glass Design:**
- First major UI redesign since iOS 7 (2013)
- Translucent, glass-like interface elements
- Affects app icons, widgets, controls

**Apple Intelligence:**
- Requires A17 Pro chip or newer
- Not available on older devices
- AI-powered Siri improvements delayed to iOS 26.4+

**Home Screen Changes:**
- Flexible icon placement (gaps allowed)
- Resizable widgets on-the-fly
- Dark/Light/Tinted/Clear themes
- Convert apps ↔ widgets easily

**PWA Improvements (iOS 16.4+):**
- Push notification support
- Better background capabilities (limited)
- Improved Service Worker support
- OPFS available since iOS 15.4

---

## PWA Capabilities on iOS

### What Works

✅ **Offline functionality** (Service Workers for caching)
✅ **Push notifications** (added in iOS 16.4, but PWA must be on home screen)
✅ **Add to Home Screen** (manual via Safari share menu)
✅ **OPFS storage** (38GB+ quota on modern iPhones)
✅ **IndexedDB** (persistent storage)
✅ **Geolocation** (with permission)
✅ **Camera/Microphone** (with permission)
✅ **DeviceMotion sensors** (accelerometer, gyroscope)
✅ **WebRTC** (peer-to-peer connections)
✅ **Web Workers** (background threading)

### What Doesn't Work

❌ **Native widgets** (PWAs cannot create home screen widgets)
❌ **True background processing** (limited to Service Workers)
❌ **Background sync** (no periodic background sync API)
❌ **Deep app integration** (no Shortcuts, Siri, or inter-app communication)
❌ **Bluetooth** (Web Bluetooth not supported)
❌ **USB** (WebUSB not supported)
❌ **File System Access API** (user-visible files, only OPFS works)
❌ **Badging API** (no app icon badges)
❌ **Wake Lock API** (screen cannot stay on)
❌ **Background fetch** (no periodic updates when app closed)

### Safari-Only Reality

**Critical:** Safari is the ONLY browser that fully supports PWAs on iOS. Chrome, Firefox, Edge all use WebKit under the hood and have even fewer PWA features (no push notifications, limited APIs). Always develop/test in Safari.

---

## Storage: OPFS vs IndexedDB

### Origin Private File System (OPFS)

**Availability:** iOS 15.4+ (Safari 15.4, March 2022)

**Advantages:**
- **Massive quota:** 38GB+ on iPhone, 76GB+ on iPad (vs 10GB in Firefox)
- **Fast:** 3-4x faster than IndexedDB for file operations
- **Synchronous access:** In Web Workers via `FileSystemSyncAccessHandle`
- **Byte-level control:** Read/write specific byte ranges
- **Streaming:** Direct file streaming for large media

**Access:**
```javascript
// Get OPFS root
const opfsRoot = await navigator.storage.getDirectory();

// Create file
const fileHandle = await opfsRoot.getFileHandle('data.bin', { create: true });

// Write (main thread - async)
const writable = await fileHandle.createWritable();
await writable.write(data);
await writable.close();

// Write (worker - sync, MUCH faster)
const accessHandle = await fileHandle.createSyncAccessHandle();
accessHandle.write(buffer, { at: 0 });
accessHandle.flush();
accessHandle.close();
```

**CRITICAL iOS LIMITATION:**
When using WKWebView (embedded web view in native apps), each file in OPFS is limited to **10MB maximum**. This does NOT apply to Safari browser, only embedded web views. For Statik.ai as a PWA in Safari, no per-file limit exists (only total quota matters).

**Quota Management:**
```javascript
// Check available space
const estimate = await navigator.storage.estimate();
console.log('Quota:', estimate.quota / 1024 / 1024, 'MB');
console.log('Usage:', estimate.usage / 1024 / 1024, 'MB');
console.log('Available:', (estimate.quota - estimate.usage) / 1024 / 1024, 'MB');

// Request persistent storage (avoid eviction)
const persistent = await navigator.storage.persist();
console.log('Persistent:', persistent);
```

**Storage Eviction:**
If PWA not opened for **7 days**, iOS may evict all storage (OPFS + IndexedDB). After eviction, app must re-download everything. Solution: Remind users to open app regularly, or use push notifications to re-engage.

### IndexedDB

**When to use:**
- Structured data (episodes, concepts, skills)
- Transactional consistency needed
- Small-medium datasets (<100MB)

**When to avoid:**
- Large files (>10MB per record)
- Frequent writes (slower than OPFS)
- Binary data (use OPFS instead)

### Storage Strategy for Statik.ai

**Hybrid approach:**

```javascript
// IndexedDB: Structured cognitive data
statik_memory (episodes, concepts, skills)
statik_state (unit states, kernel metadata)
statik_logs (deltas, errors, actions)

// OPFS: Large files, source code, snapshots
/snapshots/statik-YYYYMMDD.iso (complete snapshots)
/source/ (VFS source tree)
/exports/ (user backups)
/cache/ (temp files, can be deleted)
```

---

## Background Processing

### Reality Check

PWAs on iOS have **severely limited** background processing compared to native apps or Android PWAs. Service Workers can run in background, but only for specific tasks (caching, push notifications). No general-purpose background execution.

### What Works

**Service Worker Background Tasks:**
- ✅ Cache management (fetch event, cache updates)
- ✅ Push notification handling (push event)
- ✅ Sync operations (when triggered by user action)

**Example:**
```javascript
// sw.js
self.addEventListener('push', (event) => {
  // Runs even if app closed
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png'
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Intercept network requests
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

### What Doesn't Work

❌ **Periodic Background Sync:** No API to run code periodically when app closed  
❌ **Background Fetch:** Cannot download large files in background  
❌ **Geofencing:** No background location monitoring  
❌ **Timers in background:** `setTimeout`/`setInterval` throttled/paused when app backgrounded

### Workarounds

**1. Foreground-Only Design:**
Statik.ai assumes app is open when user interacts. Background tasks (learning, consolidation) run when app visible.

**2. Service Worker for Critical Tasks:**
Only essential operations (push notifications, cache updates) in Service Worker.

**3. Resume on Open:**
When app reopens, check timestamp, resume interrupted tasks:
```javascript
// On app open
const lastOpen = localStorage.getItem('last_open');
const now = Date.now();
if (now - lastOpen > 60 * 60 * 1000) { // 1 hour
  // Resume learning, sync memories, etc.
  await cm.consolidateMemories();
  await sync.checkPendingSync();
}
localStorage.setItem('last_open', now);
```

---

## Push Notifications

### Requirements

**Critical:** Push notifications ONLY work if:
1. PWA is added to home screen (not just bookmarked)
2. User grants notification permission
3. Service Worker is registered

If user accesses via Safari browser (not home screen icon), notifications DO NOT work.

### Implementation

**1. Request Permission:**
```javascript
// Must be triggered by user action (button click)
async function requestNotificationPermission() {
  if ('Notification' in window && 'serviceWorker' in navigator) {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notifications enabled');
      await subscribeToP ush();
    } else {
      console.log('Notifications denied');
    }
  }
}
```

**2. Subscribe to Push:**
```javascript
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;
  
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });
  
  // Send subscription to server (for Statik.ai P2P mesh)
  await sendSubscriptionToServer(subscription);
}
```

**3. Handle Push in Service Worker:**
```javascript
// sw.js
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/assets/icons/icon-192.png',
      badge: '/assets/icons/badge-72.png',
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
```

### iOS-Specific Gotchas

1. **Opt-out by default:** Users are automatically opted OUT of notifications initially
2. **No notification preview:** iOS doesn't show content until user unlocks device
3. **Grouped notifications:** Multiple notifications stack together
4. **Silent notifications:** Not supported (all notifications must be visible)
5. **7-day rule:** If app not opened for 7 days, notifications may stop (storage evicted)

### Statik.ai Notification Use Cases

**Allowed (useful):**
- Learning milestones ("Pattern confidence reached 85%!")
- P2P sync completions ("Memories synced with laptop")
- Critical errors ("Memory quota exceeded, cleanup needed")
- User-requested reminders ("Daily reflection reminder")

**Avoid (annoying):**
- Frequent updates (will be ignored/disabled)
- Marketing/promotional content
- Non-critical info

---

## Widgets (Limitations)

### Hard Truth

**PWAs CANNOT create native iOS widgets.** Widgets require native app APIs (WidgetKit in Swift). Only native apps or App Clip apps can create widgets.

### What iOS 18/26 Widget Features Are

iOS 18 introduced:
- Interactive widgets (buttons work in widgets)
- Resizable widgets (drag to resize)
- Convert apps ↔ widgets
- Live Activities (dynamic updates)

BUT: These are for **native apps only**. PWAs cannot use these APIs.

### Workarounds

**Option 1: Native App Wrapper (Capacitor/Cordova)**
Wrap Statik.ai PWA in native shell to access WidgetKit:
- Requires macOS + Xcode
- Requires Apple Developer account ($99/year)
- Can create actual widgets
- Can submit to App Store

**Option 2: Third-Party Widget Apps**
Apps like "Widget Web 26" allow users to create custom web widgets:
- User installs separate widget app
- User configures widget to show Statik.ai URL
- Widget displays web content (limited interactivity)
- NOT a native Statik.ai feature, user must set up manually

**Option 3: Skip Widgets**
Most practical for MVP. Focus on in-app experience. Widgets can be added later via native wrapper if needed.

### Statik.ai Widget Strategy

**MVP (v0.1-v0.2):** No widgets. PWA only.

**v0.3+ (if needed):**
- Capacitor wrapper for native features
- Create simple widgets:
  - System status (uptime, memory usage)
  - Recent memory count
  - Learning progress bar
  - Quick actions (open chat, view inspector)

**Implementation (future):**
```swift
// Swift WidgetKit code (IF using Capacitor wrapper)
import WidgetKit
import SwiftUI

struct StatikWidget: Widget {
    let kind: String = "StatikWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            StatikWidgetView(entry: entry)
        }
        .configurationDisplayName("Statik.ai Status")
        .description("System status and quick actions")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
```

---

## Hardware Access

### Supported APIs

**Camera & Microphone:**
```javascript
// Request camera
const stream = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'user' } // or 'environment' for rear camera
});

// Request microphone
const audioStream = await navigator.mediaDevices.getUserMedia({
  audio: true
});

// Capture photo
const video = document.querySelector('video');
video.srcObject = stream;

const canvas = document.querySelector('canvas');
canvas.getContext('2d').drawImage(video, 0, 0);
const photoBlob = await new Promise(r => canvas.toBlob(r));
```

**Motion Sensors:**
```javascript
// DeviceMotion (accelerometer + gyroscope)
window.addEventListener('devicemotion', (event) => {
  const acc = event.acceleration;
  const gyro = event.rotationRate;
  
  console.log('Acceleration:', acc.x, acc.y, acc.z);
  console.log('Rotation:', gyro.alpha, gyro.beta, gyro.gamma);
});

// DeviceOrientation (compass)
window.addEventListener('deviceorientation', (event) => {
  console.log('Orientation:', event.alpha, event.beta, event.gamma);
});

// iOS 13+ requires permission request
if (typeof DeviceMotionEvent.requestPermission === 'function') {
  const permission = await DeviceMotionEvent.requestPermission();
  if (permission === 'granted') {
    // Add listeners
  }
}
```

**Geolocation:**
```javascript
// One-time location
navigator.geolocation.getCurrentPosition(
  (position) => {
    console.log('Lat:', position.coords.latitude);
    console.log('Lng:', position.coords.longitude);
    console.log('Accuracy:', position.coords.accuracy, 'm');
  },
  (error) => console.error('Location error:', error),
  { enableHighAccuracy: true, timeout: 5000 }
);

// Watch location (updates when moves)
const watchId = navigator.geolocation.watchPosition(
  (position) => {
    // Update location
  },
  (error) => console.error(error),
  { enableHighAccuracy: true }
);

// Stop watching
navigator.geolocation.clearWatch(watchId);
```

**Vibration (Haptics):**
```javascript
// Simple vibration
navigator.vibrate(200); // 200ms

// Pattern: [vibrate, pause, vibrate, ...]
navigator.vibrate([100, 50, 100, 50, 100]);

// Stop vibration
navigator.vibrate(0);
```

### Unsupported APIs

❌ **Bluetooth:** Web Bluetooth API not supported
❌ **USB:** WebUSB not supported
❌ **NFC:** Web NFC not supported
❌ **Ambient Light Sensor:** Not available
❌ **Proximity Sensor:** Not available
❌ **Barometer:** No API access

### Statik.ai Hardware Integration

**Planned usage:**
- **Camera:** Future feature for visual context (OCR, image analysis)
- **Motion:** Detect phone shake for undo/refresh gestures
- **Geolocation:** Location-aware memories (optional, privacy-first)
- **Haptics:** Feedback for critical events (errors, completions)

**Implementation example:**
```javascript
// hardware.adapter.js (iOS-specific)
export class HardwareAdapter {
  async requestCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1920, height: 1080 }
      });
      return stream;
    } catch (error) {
      console.error('[hardware] Camera access denied:', error);
      sa.u.registerCapability('hardware', 'camera', false);
      return null;
    }
  }
  
  startMotionTracking(callback) {
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().then((permission) => {
        if (permission === 'granted') {
          window.addEventListener('devicemotion', callback);
        }
      });
    } else {
      window.addEventListener('devicemotion', callback);
    }
  }
  
  vibrate(pattern) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }
}
```

---

## App Integration

### What's NOT Possible

❌ **Siri Integration:** PWAs cannot add Siri shortcuts or voice commands
❌ **Shortcuts App:** Cannot create iOS Shortcuts directly
❌ **Inter-App Communication:** Cannot send data to other apps
❌ **Share Sheet Extension:** Cannot appear as share target
❌ **Document Provider:** Cannot appear in file picker
❌ **App Extensions:** No Today widget, keyboard, etc.

### What IS Possible

✅ **Web Share API:** Share content TO other apps
✅ **File Input:** Accept files from other apps
✅ **Deep Links:** Open Statik.ai from external links
✅ **App Banners:** Smart app banner for installation

### Web Share API

```javascript
// Share from Statik.ai to other apps
async function shareMemory(memory) {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Memory from Statik.ai',
        text: memory.content,
        url: `https://statik.ai/memory/${memory.id}`
      });
      console.log('Shared successfully');
    } catch (error) {
      console.error('Share failed:', error);
    }
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(memory.content);
    alert('Copied to clipboard');
  }
}
```

### File Handling

```javascript
// Accept files from other apps (Files app, Photos, etc.)
<input type="file" accept="image/*,application/pdf" multiple>

document.querySelector('input[type="file"]').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    const buffer = await file.arrayBuffer();
    // Process file
    await pce.processInput({ type: 'file', name: file.name, data: buffer });
  }
});
```

### Deep Links

```html
<!-- Manifest.json -->
{
  "start_url": "/",
  "scope": "/",
  "shortcuts": [
    {
      "name": "Open Chat",
      "short_name": "Chat",
      "description": "Open chat interface",
      "url": "/?action=chat",
      "icons": [{ "src": "/icon-96.png", "sizes": "96x96" }]
    }
  ]
}
```

```javascript
// Handle deep link on app open
const params = new URLSearchParams(window.location.search);
if (params.get('action') === 'chat') {
  ui.renderChat();
} else if (params.get('action') === 'inspect') {
  ui.renderInspector();
}
```

### App Banners

```html
<!-- Encourage installation -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Statik.ai">
<link rel="apple-touch-icon" href="/assets/icons/icon-180.png">
```

---

## Installation & Distribution

### Installation Process (iOS)

**For users:**
1. Open https://statik.ai in Safari
2. Tap Share button (box with arrow)
3. Scroll down, tap "Add to Home Screen"
4. Customize name (optional)
5. Tap "Add"
6. Icon appears on home screen

**Challenge:** This is NOT intuitive. Users don't know to do this. Must educate.

### In-App Install Prompt

```javascript
// Detect if running as PWA
function isPWA() {
  return window.navigator.standalone === true;
}

// Show install instructions (if not PWA)
if (!isPWA()) {
  document.getElementById('install-banner').style.display = 'block';
}
```

```html
<!-- Install banner -->
<div id="install-banner" style="display: none;">
  <p>Install Statik.ai for full offline support</p>
  <ol>
    <li>Tap <img src="/share-icon.svg" alt="share" style="width:16px;"> in Safari</li>
    <li>Select "Add to Home Screen"</li>
    <li>Tap "Add"</li>
  </ol>
  <button onclick="document.getElementById('install-banner').style.display='none'">Dismiss</button>
</div>
```

### Distribution Options

**Option 1: Direct URL (Recommended for MVP)**
- User visits https://statik.ai
- Works immediately (no installation required)
- Can add to home screen manually
- No approval process needed
- Free

**Option 2: App Store (via Capacitor wrapper)**
- Wrap PWA in native shell
- Submit to App Store
- Requires:
  - macOS + Xcode
  - Apple Developer account ($99/year)
  - App review (1-2 weeks)
- Pros:
  - Discoverability
  - Native widgets possible
  - Users trust App Store
- Cons:
  - Apple takes 30% cut (if paid)
  - Approval process
  - Maintenance overhead

**Option 3: TestFlight Beta**
- Distribute beta via TestFlight
- Up to 10,000 testers
- No App Store approval needed (for beta)
- Still requires Developer account

**Option 4: Enterprise Distribution**
- For internal company use
- Requires Apple Developer Enterprise account ($299/year)
- Can sideload without App Store

### Statik.ai Distribution Strategy

**Phase 1 (MVP):** Direct URL only
- https://statik.ai
- Users add to home screen manually
- Clear installation instructions

**Phase 2 (v0.3+):** TestFlight Beta
- Wrap in Capacitor
- Distribute to early adopters
- Gather feedback

**Phase 3 (v1.0+):** App Store (if viable)
- Public release
- Native widgets, better performance
- Wider reach

---

## Performance Optimization

### iOS-Specific Performance Tips

**1. Minimize JavaScript Execution:**
iOS Safari is slower than desktop Chrome. Optimize:
```javascript
// Bad: Re-calculate every frame
function update() {
  const data = expensiveOperation();
  render(data);
  requestAnimationFrame(update);
}

// Good: Cache and throttle
let cachedData = null;
let lastUpdate = 0;
function update() {
  const now = Date.now();
  if (now - lastUpdate > 100) { // Max 10 FPS
    cachedData = expensiveOperation();
    lastUpdate = now;
  }
  render(cachedData);
  requestAnimationFrame(update);
}
```

**2. Lazy Load Everything:**
Don't load all units at boot. Import dynamically:
```javascript
// Bad: Import all units upfront
import pce from './units/pce.u.js';
import as from './units/as.u.js';
// ... 17 more

// Good: Import on-demand
const pce = await import('./units/pce.u.js');
```

**3. Use Web Workers for Heavy Work:**
Offload computation to workers:
```javascript
// Main thread
const worker = new Worker('cognition.worker.js');
worker.postMessage({ type: 'pattern_match', data: tokens });
worker.onmessage = (e) => {
  const result = e.data.result;
  nlp.handlePatternMatch(result);
};
```

**4. Optimize Images:**
Use WebP format (supported in iOS 14+), lazy load images, compress heavily:
```html
<img src="icon-72.webp" loading="lazy" alt="icon">
```

**5. Cache Aggressively:**
Service Worker should cache ALL static assets:
```javascript
// sw.js
const CACHE_NAME = 'statik-v0.1.0';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/src/kernel/kernel.u.js',
  // ... all files
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});
```

**6. Reduce Memory Usage:**
iOS terminates apps aggressively if memory exceeds limit:
```javascript
// Monitor memory (iOS Safari reports)
if (performance.memory) {
  const used = performance.memory.usedJSHeapSize / 1024 / 1024;
  const limit = performance.memory.jsHeapSizeLimit / 1024 / 1024;
  
  if (used / limit > 0.9) {
    // Emergency cleanup
    hc.emergencyPrune();
  }
}
```

**7. Debounce Input:**
```javascript
// Don't process every keystroke
let debounceTimer;
input.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    pce.processInput(e.target.value);
  }, 300); // Wait 300ms after user stops typing
});
```

### Measuring Performance

```javascript
// Use Performance API
const t0 = performance.now();
await kernel.boot();
const t1 = performance.now();
telemetry.recordMetric('performance', 'boot_time_ms', t1 - t0);

// Use Performance Observer
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(entry.name, entry.duration);
  }
});
observer.observe({ entryTypes: ['measure', 'navigation'] });
```

---

## Workarounds & Alternatives

### Problem: No Background Sync

**Workaround:** Sync on app open
```javascript
// On app resume
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible') {
    await sync.syncMemories();
  }
});
```

### Problem: No Widgets

**Workaround 1:** Rich notifications instead
```javascript
// Instead of widget showing latest memory, send notification
await self.registration.showNotification('Latest Memory', {
  body: memory.content,
  icon: '/icon-192.png',
  badge: '/badge-72.png',
  actions: [
    { action: 'view', title: 'View' },
    { action: 'dismiss', title: 'Dismiss' }
  ]
});
```

**Workaround 2:** Encourage users to keep app open in background
- iOS allows multiple apps in App Switcher
- App stays warm, resumes instantly
- Not true background, but better than cold start

### Problem: Storage Eviction (7 days)

**Workaround:** Regular engagement
```javascript
// Send weekly push notification reminder
if (daysSinceLastOpen > 6) {
  sendPushNotification({
    title: 'Statik.ai misses you!',
    body: 'Open the app to keep your memories safe'
  });
}
```

### Problem: No Deep System Integration

**Workaround:** Web standards only
- Use Web Share instead of native share sheets
- Use navigator.clipboard instead of system clipboard integration
- Build UI for features native apps get for free

---

## Testing & Debugging

### Remote Debugging (iPhone → Mac)

**Setup:**
1. Connect iPhone to Mac via USB
2. On iPhone: Settings → Safari → Advanced → Web Inspector (enable)
3. On Mac: Safari → Develop → [Your iPhone Name] → [Statik.ai]

**Features:**
- Console logs
- Network inspector
- DOM inspector
- JavaScript debugger
- Timeline/Performance

### iOS Simulator (Xcode)

**Pros:**
- No physical device needed
- Easy screenshots/videos
- Multiple iOS versions

**Cons:**
- Performance doesn't match real device
- Push notifications don't work
- Some sensors missing

**Usage:**
```bash
# Install Xcode (from App Store)
# Open Simulator: Xcode → Open Developer Tool → Simulator
# Open Safari in simulator → navigate to https://statik.ai
```

### BrowserStack / LambdaTest

Test on real iOS devices in cloud:
- Multiple iOS versions (iOS 15-26)
- Multiple devices (iPhone, iPad)
- No Mac required

### Lighthouse Audit

```bash
npm install -g lighthouse
lighthouse https://statik.ai --view --preset=mobile
```

Checks:
- Performance
- PWA compliance
- Accessibility
- Best practices

### Common Issues

**Issue:** Service Worker not updating
**Solution:** Use versioned cache names, unregister old workers
```javascript
// sw.js
const CACHE_VERSION = 'v0.1.1'; // Increment on each deploy
```

**Issue:** OPFS not working
**Solution:** Check HTTPS (required), check iOS version (15.4+)

**Issue:** Notifications not appearing
**Solution:** Verify PWA installed to home screen, permission granted

**Issue:** App crashes on low memory
**Solution:** Implement hc.u memory monitoring, prune aggressively

---

## Appendix: iOS Capability Matrix

| Feature | iOS 26 Support | Statik.ai Usage |
|---------|---------------|-----------------|
| **Storage** |
| IndexedDB | ✅ Full | Primary structured data |
| OPFS | ✅ Full (iOS 15.4+) | Large files, snapshots |
| localStorage | ✅ Full | Small config only |
| **Networking** |
| Service Workers | ✅ Full | Offline, caching |
| Push Notifications | ✅ Limited (home screen only) | User engagement |
| WebRTC | ✅ Full | P2P mesh networking |
| WebSocket | ✅ Full | Future: real-time sync |
| **Hardware** |
| Camera | ✅ Full | Future: visual context |
| Microphone | ✅ Full | Future: voice input |
| Geolocation | ✅ Full | Location-aware memories |
| DeviceMotion | ✅ Full | Gesture detection |
| Vibration | ✅ Full | Haptic feedback |
| Bluetooth | ❌ None | Not planned |
| NFC | ❌ None | Not planned |
| **UI** |
| Fullscreen | ✅ Standalone mode | Used when installed |
| Home screen icons | ✅ Via manifest | Primary entry point |
| Widgets | ❌ None | Future: Capacitor wrapper |
| Splash screen | ✅ Via manifest | Branding |
| **System** |
| Background sync | ❌ None | Workaround: sync on open |
| Badge API | ❌ None | Not needed |
| Wake Lock | ❌ None | Not critical |
| File System Access | ❌ None (OPFS only) | OPFS sufficient |

---

## References & Resources

**Apple Documentation:**
- [PWA on iOS - Apple Developer](https://developer.apple.com/documentation/webkit/progressive_web_apps)
- [Web App Manifest - Apple](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)

**WebKit Blog:**
- [File System API with OPFS - WebKit](https://webkit.org/blog/12257/the-file-system-access-api-with-origin-private-file-system/)

**Community Resources:**
- [iOS PWA Limitations (2025) - Brainhub](https://brainhub.eu/library/pwa-on-ios)
- [PWA iOS Guide - Scandiweb](https://scandiweb.com/blog/pwa-ios-strategies/)

**Testing:**
- [BrowserStack](https://www.browserstack.com/)
- [LambdaTest](https://www.lambdatest.com/)
- [OPFS Explorer Chrome Extension](https://chrome.google.com/webstore/detail/opfs-explorer/)

---

**End of IOS.md**