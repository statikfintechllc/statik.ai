## TESTS DIRECTORY

### **tests/unit/**
**Purpose:** Unit tests for individual functions/units  
**Structure:**
```
tests/unit/
├─ kernel.test.js
├─ bus.test.js
├─ units/
│  ├─ pce.test.js
│  ├─ nlp.test.js
│  ├─ cm.test.js
│  └─ ...
├─ utils/
│  ├─ id.test.js
│  ├─ math.test.js
│  └─ ...
└─ setup.js
```
**Test Framework:** Lightweight (no external dependencies initially)
- Custom test runner or minimal library (e.g., uvu, tape)
- Or built-in via dev.u.js assertions

**Example test structure:**
```javascript
// tests/unit/utils/id.test.js
import { test, assert } from '../setup.js';
import { generateId, uuid } from '../../src/utils/id.js';

test('generateId: creates unique IDs', () => {
  const id1 = generateId('test');
  const id2 = generateId('test');
  assert(id1 !== id2, 'IDs should be unique');
  assert(id1.startsWith('test_'), 'ID should have prefix');
});

test('uuid: creates valid RFC4122 UUIDs', () => {
  const id = uuid();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  assert(uuidRegex.test(id), 'UUID should match RFC4122 format');
});
```

**Coverage targets:**
- Utils: 90%+ (pure functions, easy to test)
- Units: 70%+ (integration-heavy, harder to isolate)
- Bus/Kernel: 80%+ (critical infrastructure)

**Run via:**
- `npm test` or custom test runner
- dev.u.js can trigger tests in browser

---

### **tests/integration/**
**Purpose:** Multi-unit interaction tests  
**Structure:**
```
tests/integration/
├─ boot-sequence.test.js
├─ message-flow.test.js
├─ memory-learning.test.js
├─ ui-interaction.test.js
└─ bridge-commands.test.js
```

**Example test:**
```javascript
// tests/integration/message-flow.test.js
import { test, assert } from '../setup.js';
import { boot } from '../../bootstrap/boot.js';

test('Input flows through pce → nlp → ui', async () => {
  await boot();
  
  // Simulate user input
  const input = "Hello, world!";
  bus.emit('ui.input', { text: input });
  
  // Wait for response
  const response = await new Promise(resolve => {
    bus.on('ui.render', (data) => resolve(data));
  });
  
  assert(response.content, 'Should receive response');
  assert(response.content.includes('Hello'), 'Response should acknowledge greeting');
});
```

**Key test scenarios:**
- Boot → Ready (full initialization)
- Input → Parse → Store → Respond (full pipeline)
- Memory store → Retrieve → Use in response
- Learning: Pattern confidence increases after success
- Bridge: Remote command execution

---

### **tests/e2e/** (End-to-End)
**Purpose:** Full user workflows  
**Structure:**
```
tests/e2e/
├─ conversation.test.js
├─ memory-recall.test.js
├─ learning-loop.test.js
└─ offline-mode.test.js
```

**Tool:** Playwright or Puppeteer (browser automation)

**Example test:**
```javascript
// tests/e2e/conversation.test.js
import { test } from '@playwright/test';

test('User has multi-turn conversation', async ({ page }) => {
  await page.goto('http://localhost:8080');
  
  // Wait for system ready
  await page.waitForSelector('#chat');
  
  // Send first message
  await page.fill('#user-input', 'My name is Daniel');
  await page.click('#send');
  
  // Check response
  const response1 = await page.waitForSelector('.message.system');
  expect(await response1.textContent()).toContain('Daniel');
  
  // Send second message
  await page.fill('#user-input', 'What is my name?');
  await page.click('#send');
  
  // Check memory recall
  const response2 = await page.waitForSelector('.message.system:last-child');
  expect(await response2.textContent()).toContain('Daniel');
});
```

**Critical workflows:**
- First boot (fresh install)
- Returning user (state restoration)
- Offline mode (service worker)
- Learning from corrections
- Export/import state

**Run via:**
- CI/CD pipeline (GitHub Actions)
- Manual: `npm run test:e2e`

---

## Browser-Native Test Runner

Since the CSA.OS runs entirely in the browser, tests MUST be executable in the browser:

### Test Runner Architecture

- **Runner:** Custom lightweight test runner that runs as a unit (test.runner.u.js)
- **Execution:** Tests loaded as ES modules, executed in browser context
- **Output:** Results emitted to bus topic `test.result`, displayed in UI inspector
- **Trigger:** dev.u `?dev=true` mode OR bridge.u remote test command

### Performance Benchmarks (Enforced)

| Metric | Target | Test |
|--------|--------|------|
| Cold boot time | <2000ms | tests/e2e/boot.benchmark.js |
| Message latency (bus) | <15ms avg | tests/unit/bus.benchmark.js |
| NLP Tier 1 (regex) | <5ms | tests/unit/nlp.tier1.benchmark.js |
| NLP Tier 2 (statistical) | <50ms | tests/unit/nlp.tier2.benchmark.js |
| NLP Tier 3 (inference) | <200ms | tests/unit/nlp.tier3.benchmark.js |
| Memory retrieval (TF-IDF) | <50ms | tests/unit/cm.benchmark.js |

### Security Tests

- `tests/security/csp.test.js`: Verify CSP blocks inline scripts and external resources
- `tests/security/encryption.test.js`: Verify all mesh traffic is encrypted
- `tests/security/auth.test.js`: Verify peer authentication handshake
- `tests/security/selfmod.test.js`: Verify self-modification safety rails

### P2P Mesh Tests

- `tests/integration/mesh.connect.test.js`: Two instances discover and connect
- `tests/integration/mesh.sync.test.js`: State sync between two instances
- `tests/integration/mesh.conflict.test.js`: Conflict resolution for concurrent edits
- `tests/integration/mesh.relay.test.js`: Peer-assisted relay for NAT traversal

### On-Device ML Tests

- `tests/unit/inference.load.test.js`: Model loading from OPFS
- `tests/unit/inference.classify.test.js`: Intent classification accuracy
- `tests/unit/inference.fallback.test.js`: Graceful degradation without WebGPU

