# Testing Guide

## Local Development Setup

### Prerequisites
- Python 3.x or Node.js installed
- Modern browser (Safari, Chrome, or Edge)
- For iOS testing: iPhone with Developer Mode enabled

## Quick Start

### Option 1: Python HTTP Server

```bash
# Navigate to project directory
cd /path/to/statik.ai

# Start server (Python 3)
python3 -m http.server 8000

# Or Python 2
python -m SimpleHTTPServer 8000
```

Open browser: `http://localhost:8000`

### Option 2: Node.js HTTP Server

```bash
# Install http-server globally
npm install -g http-server

# Start server
http-server -p 8000

# With CORS enabled
http-server -p 8000 --cors
```

Open browser: `http://localhost:8000`

### Option 3: VS Code Live Server

1. Install "Live Server" extension in VS Code
2. Right-click `index.html`
3. Select "Open with Live Server"

## Testing on iOS Device

### Network Testing (Same WiFi)

1. **Find your computer's local IP**:
   ```bash
   # macOS/Linux
   ifconfig | grep "inet "
   
   # Windows
   ipconfig
   ```

2. **Start server on your computer**:
   ```bash
   python3 -m http.server 8000
   ```

3. **Access from iPhone**:
   - Open Safari
   - Navigate to `http://YOUR_IP:8000`
   - Example: `http://192.168.1.100:8000`

### Testing PWA Installation

1. Open the app in Safari on iOS
2. Tap the Share button
3. Select "Add to Home Screen"
4. Name it "CSA.OS"
5. Tap "Add"
6. Open from home screen

### Testing Developer Mode Features

#### Enable Developer Mode

1. Connect iPhone to Mac with Xcode
2. Settings → Privacy & Security → Developer Mode
3. Toggle ON
4. Restart device
5. Confirm activation

#### Enable Safari Experimental Features

Settings → Safari → Advanced → Experimental Features:
- [x] File System Access API
- [x] SharedArrayBuffer
- [x] WebAssembly Threads  
- [x] WebGPU
- [x] Web Locks API
- [x] Background Sync

#### Verify Features in Console

```javascript
// Open Safari Inspector (connect iPhone to Mac)
// Safari → Develop → [Your iPhone] → [Your Page]

// Check capabilities
CSA.system.getAllCapabilities()

// Should see all features as 'true'
```

## Feature Testing

### Test Storage (OPFS + IndexedDB)

```javascript
// In browser console

// Test OPFS write
const data = new TextEncoder().encode('Test data');
await CSA.storage.writeFile('test.txt', data);

// Test OPFS read
const read = await CSA.storage.readFile('test.txt');
console.log(new TextDecoder().decode(read));

// Test IndexedDB
await CSA.storage.saveState('test-key', { value: 123 });
const state = await CSA.storage.getState('test-key');
console.log(state); // { value: 123 }

// Check storage quota
const stats = await CSA.storage.getStats();
console.log(`${stats.usageGB} GB / ${stats.quotaGB} GB`);
```

### Test Agent System

```javascript
// Create agent
const agent = await CSA.createAgent();
console.log('Agent ID:', agent.id);

// Execute task
const result = await CSA.runtime.executeTask(agent.id, {
    type: 'test',
    data: { message: 'Hello' }
});
console.log('Result:', result);

// Check agent stats
console.log('Runtime:', CSA.runtime.getStats());
```

### Test Hardware Monitoring

```javascript
// Get metrics
const metrics = CSA.getMetrics();
console.log('CPU cores:', metrics.cpu.cores);
console.log('Memory:', metrics.memory);
console.log('Storage:', metrics.storage);

// Start monitoring
CSA.hardware.startMonitoring(1000);

// Check continuously
setInterval(() => {
    const m = CSA.hardware.getAllMetrics();
    console.log('Memory usage:', m.memory.percentage + '%');
}, 2000);
```

### Test Service Worker

```javascript
// Check registration
navigator.serviceWorker.getRegistration().then(reg => {
    console.log('Service Worker:', reg);
    console.log('Active:', reg.active);
});

// Check cache
caches.keys().then(keys => {
    console.log('Cached:', keys);
});

// Test offline mode
// 1. Disconnect from internet
// 2. Reload page
// 3. Should still work (cached)
```

### Test Task Scheduler

```javascript
// Add task
const taskId = await CSA.scheduler.addTask({
    type: 'test-task',
    priority: 7,
    data: { test: true }
});

// Check status
console.log('Task:', CSA.scheduler.getTask(taskId));

// Get stats
console.log('Scheduler:', CSA.scheduler.getStats());
```

## Performance Testing

### Load Test

```javascript
// Create multiple agents
const agents = [];
for (let i = 0; i < 10; i++) {
    agents.push(await CSA.runtime.createAgent({
        name: `Agent-${i}`
    }));
}

// Execute tasks in parallel
const start = performance.now();
const results = await Promise.all(
    agents.map(a => CSA.runtime.executeTask(a.id, {
        type: 'compute',
        complexity: 5
    }))
);
const duration = performance.now() - start;

console.log(`10 agents, ${duration}ms total`);
console.log(`${(duration / 10).toFixed(2)}ms per agent`);
```

### Storage Performance

```javascript
// Write test
const largeData = new Uint8Array(1024 * 1024); // 1MB
const writeStart = performance.now();
await CSA.storage.writeFile('large.bin', largeData);
const writeTime = performance.now() - writeStart;

console.log(`Write 1MB: ${writeTime.toFixed(2)}ms`);

// Read test
const readStart = performance.now();
const readData = await CSA.storage.readFile('large.bin');
const readTime = performance.now() - readStart;

console.log(`Read 1MB: ${readTime.toFixed(2)}ms`);
```

## Debugging

### Safari Web Inspector (iOS)

1. Enable on iPhone:
   - Settings → Safari → Advanced → Web Inspector: ON

2. Connect to Mac:
   - Connect iPhone via USB
   - Open Safari on Mac
   - Safari → Develop → [Your iPhone] → [Your Page]

3. Inspect:
   - Console for logs
   - Storage tab for IndexedDB/Cache
   - Network for requests
   - Sources for debugging

### Chrome DevTools (Desktop Testing)

1. Open DevTools (F12 or Cmd+Opt+I)
2. Application tab:
   - Service Workers
   - Storage (IndexedDB, Cache)
   - Manifest
3. Console tab for debugging
4. Performance tab for profiling

### Common Issues

#### Service Worker not registering
- Ensure running on localhost or HTTPS
- Check console for errors
- Try unregistering: `navigator.serviceWorker.getRegistrations().then(r => r[0].unregister())`

#### OPFS not available
- Enable "File System Access API" in Safari Experimental Features
- Check: `'storage' in navigator && 'getDirectory' in navigator.storage`

#### SharedArrayBuffer not available
- Enable in Safari Experimental Features
- For production, requires COOP/COEP headers

#### IndexedDB errors
- Clear browser data
- Check quota: `navigator.storage.estimate()`
- Ensure not in private browsing

## Automated Testing

### Unit Tests (Future)

```javascript
// Example test structure
describe('Agent System', () => {
    it('should create agent', async () => {
        const agent = await CSA.runtime.createAgent();
        expect(agent).toBeDefined();
        expect(agent.id).toBeTruthy();
    });
    
    it('should execute task', async () => {
        const agent = await CSA.runtime.createAgent();
        const result = await CSA.runtime.executeTask(agent.id, {
            type: 'test'
        });
        expect(result.success).toBe(true);
    });
});
```

### Integration Tests

Test full workflows:
1. Initialize system
2. Create agents
3. Execute tasks
4. Verify storage
5. Check performance
6. Clean up

## CI/CD Testing

### GitHub Actions (Example)

```yaml
name: Test CSA.OS

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
      - name: Start server
        run: npx http-server -p 8000 &
      - name: Run tests
        run: npm test
```

## Performance Benchmarks

### Target Metrics

- **Initial Load**: <1s
- **Time to Interactive**: <1s  
- **Agent Creation**: <10ms
- **Task Execution**: <100ms
- **Storage Write (1MB)**: <5ms (OPFS)
- **Storage Read (1MB)**: <3ms (OPFS)
- **Memory Usage**: <50MB baseline

### Lighthouse Audit

```bash
# Install Lighthouse
npm install -g lighthouse

# Run audit
lighthouse http://localhost:8000 --view

# Target scores: 100/100 across all categories
```

## Security Testing

### Checklist

- [ ] No external dependencies loaded
- [ ] No XSS vulnerabilities
- [ ] CORS properly configured
- [ ] Content Security Policy set
- [ ] No secrets in code
- [ ] Storage properly isolated
- [ ] Service Worker scope limited

## Reporting Issues

When reporting bugs, include:
1. Device/browser information
2. Developer Mode status
3. Enabled experimental features
4. Console errors
5. Steps to reproduce
6. Expected vs actual behavior

## Next Steps

After basic testing:
1. Optimize performance bottlenecks
2. Add error handling
3. Implement missing features
4. Write comprehensive tests
5. Document edge cases
6. Create production build
