# CSA.OS Examples

## Table of Contents
- [Basic Usage](#basic-usage)
- [Agent Creation](#agent-creation)
- [Task Execution](#task-execution)
- [Storage Operations](#storage-operations)
- [Hardware Monitoring](#hardware-monitoring)
- [Background Tasks](#background-tasks)
- [Advanced Examples](#advanced-examples)

## Basic Usage

### Initialize and Check System

```javascript
// System is auto-initialized on page load
// Access via window.CSA

// Get full system information
const info = CSA.info();
console.log('System Info:', info);

// Check capabilities
const capabilities = CSA.system.getAllCapabilities();
console.log('Available capabilities:', capabilities);

// Get hardware metrics
const metrics = CSA.getMetrics();
console.log('Hardware:', metrics);
```

### Create Your First Agent

```javascript
// Simple agent creation
const agent = await CSA.createAgent();
console.log('Agent created:', agent.id);

// View all agents
const agents = CSA.getAgents();
console.log('Total agents:', agents.length);
```

## Agent Creation

### Basic Agent

```javascript
const agent = await CSA.runtime.createAgent({
    name: 'Data Processor',
    type: 'processor'
});
```

### Agent with Configuration

```javascript
const agent = await CSA.runtime.createAgent({
    name: 'Advanced Agent',
    type: 'analyzer',
    config: {
        priority: 8,
        maxConcurrent: 3,
        timeout: 30000,
        retryOnFailure: true
    }
});
```

## Task Execution

### Simple Task

```javascript
const result = await CSA.runtime.executeTask(agent.id, {
    type: 'echo',
    data: { message: 'Hello, CSA.OS!' }
});

console.log('Result:', result);
```

### Complex Task with Subtasks

```javascript
const task = {
    type: 'complex',
    priority: 7,
    steps: [
        { action: 'fetch', url: '/api/data' },
        { action: 'process', transform: 'normalize' },
        { action: 'store', location: 'cache' }
    ]
};

const result = await CSA.runtime.executeTask(agent.id, task);
```

### Task with Callback

```javascript
const task = {
    type: 'async-operation',
    data: { operation: 'compute' },
    onSuccess: (result) => {
        console.log('Task succeeded:', result);
    },
    onFailure: (error) => {
        console.error('Task failed:', error);
    }
};

await CSA.runtime.executeTask(agent.id, task);
```

## Storage Operations

### OPFS (File System)

```javascript
// Write file
const data = new TextEncoder().encode('Hello from CSA.OS');
await CSA.storage.writeFile('agents/data.txt', data);

// Read file
const fileData = await CSA.storage.readFile('agents/data.txt');
const text = new TextDecoder().decode(fileData);
console.log('File content:', text);

// List files
const files = await CSA.storage.listFiles('agents');
console.log('Files:', files);

// Delete file
await CSA.storage.deleteFile('agents/data.txt');
```

### IndexedDB

```javascript
// Save agent state
await CSA.storage.saveState('user-preferences', {
    theme: 'dark',
    language: 'en',
    notifications: true
});

// Retrieve state
const preferences = await CSA.storage.getState('user-preferences');
console.log('Preferences:', preferences);

// Save agent memory
await CSA.storage.saveMemory(agent.id, {
    key: 'learned-pattern',
    value: { pattern: 'xyz', confidence: 0.95 }
});

// Get agent memories
const memories = await CSA.storage.getAgentMemories(agent.id);
console.log('Agent memories:', memories);
```

### Storage Statistics

```javascript
const stats = await CSA.storage.getStats();
console.log(`Storage: ${stats.usageGB} GB / ${stats.quotaGB} GB`);
console.log(`Usage: ${stats.usagePercentage}%`);
```

## Hardware Monitoring

### Get Current Metrics

```javascript
// All metrics
const all = CSA.hardware.getAllMetrics();

// Specific metrics
const cpu = CSA.hardware.getCPUMetrics();
const memory = CSA.hardware.getMemoryMetrics();
const storage = CSA.hardware.getStorageMetrics();
const gpu = CSA.hardware.getGPUMetrics();

console.log('CPU cores:', cpu.cores);
console.log('Memory usage:', memory.percentage + '%');
console.log('Storage:', storage.usedGB + ' GB');
```

### Continuous Monitoring

```javascript
// Start monitoring (updates every 2 seconds by default)
CSA.hardware.startMonitoring();

// Custom interval (every second)
CSA.hardware.startMonitoring(1000);

// Stop monitoring
CSA.hardware.stopMonitoring();
```

### Performance Measurement

```javascript
// Mark start
CSA.hardware.mark('operation-start');

// Do some work
await someHeavyOperation();

// Mark end
CSA.hardware.mark('operation-end');

// Measure duration
const duration = CSA.hardware.measure(
    'operation-time',
    'operation-start',
    'operation-end'
);

console.log('Operation took:', duration, 'ms');
```

## Background Tasks

### Task Scheduler (requires importing scheduler)

```javascript
import scheduler from './core/scheduler.js';

// Initialize scheduler
await scheduler.initialize();
scheduler.start();

// Add task
const taskId = await scheduler.addTask({
    type: 'background-sync',
    priority: 6,
    data: { syncType: 'full' },
    onSuccess: (result) => {
        console.log('Background sync completed');
    }
});

// Check task status
const task = scheduler.getTask(taskId);
console.log('Task status:', task.status);

// Get scheduler stats
const stats = scheduler.getStats();
console.log('Queue:', stats.queued);
console.log('Running:', stats.running);
console.log('Success rate:', (stats.successRate * 100).toFixed(1) + '%');
```

## Advanced Examples

### Multi-Agent Collaboration

```javascript
// Create multiple agents
const agents = await Promise.all([
    CSA.runtime.createAgent({ name: 'Collector', type: 'data' }),
    CSA.runtime.createAgent({ name: 'Processor', type: 'compute' }),
    CSA.runtime.createAgent({ name: 'Analyzer', type: 'analysis' })
]);

// Execute pipeline
const data = await CSA.runtime.executeTask(agents[0].id, {
    type: 'collect',
    source: 'sensors'
});

const processed = await CSA.runtime.executeTask(agents[1].id, {
    type: 'process',
    data: data
});

const analysis = await CSA.runtime.executeTask(agents[2].id, {
    type: 'analyze',
    data: processed
});

console.log('Analysis result:', analysis);
```

### Using Agent Brain for Decision Making

```javascript
// Get agent
const agent = CSA.runtime.getAgent(agentId);

// Analyze task complexity
const task = { type: 'compute', data: largeDataset };
const analysis = agent.brain.analyzeTask(task);

console.log('Complexity:', analysis.complexity);
console.log('Estimated time:', analysis.estimatedTime, 'ms');
console.log('Strategy:', analysis.strategy);

// Make decision between options
const options = [
    { name: 'Fast', successProbability: 0.7, timeCost: 100 },
    { name: 'Reliable', successProbability: 0.95, timeCost: 500 },
    { name: 'Balanced', successProbability: 0.85, timeCost: 250 }
];

const best = agent.brain.makeDecision(options, { priority: 'high' });
console.log('Best option:', best.name);
```

### WebAssembly Integration

```javascript
import wasm from './core/wasm.js';

// Load WASM module
const instance = await wasm.loadModule('math', '/wasm/math.wasm');

// Call WASM function
const sum = wasm.call('math', 'add', 42, 58);
console.log('42 + 58 =', sum); // 100

// Benchmark WASM performance
const benchmark = await wasm.benchmark('math', 'add', 10000);
console.log('Average time:', benchmark.avgTime, 'ms');
console.log('Ops/sec:', benchmark.opsPerSecond);
```

### Batch Operations

```javascript
// Create multiple agents in batch
const agentConfigs = [
    { name: 'Agent-A', type: 'worker' },
    { name: 'Agent-B', type: 'worker' },
    { name: 'Agent-C', type: 'worker' }
];

const agents = await Promise.all(
    agentConfigs.map(config => CSA.runtime.createAgent(config))
);

// Execute tasks in parallel
const tasks = [
    { type: 'process', data: dataset1 },
    { type: 'process', data: dataset2 },
    { type: 'process', data: dataset3 }
];

const results = await Promise.all(
    agents.map((agent, i) => 
        CSA.runtime.executeTask(agent.id, tasks[i])
    )
);

console.log('All results:', results);
```

### Real-time Dashboard Updates

```javascript
// Update UI every second
setInterval(async () => {
    const metrics = CSA.hardware.getAllMetrics();
    const runtime = CSA.runtime.getStats();
    const storage = await CSA.storage.getStats();
    
    // Update dashboard
    document.getElementById('cpu').textContent = metrics.cpu.cores;
    document.getElementById('memory').textContent = metrics.memory.percentage + '%';
    document.getElementById('agents').textContent = runtime.activeAgents;
    document.getElementById('storage').textContent = storage.usageGB + ' GB';
}, 1000);
```

### Error Handling

```javascript
try {
    const result = await CSA.runtime.executeTask(agentId, task);
    console.log('Success:', result);
} catch (error) {
    console.error('Task failed:', error.message);
    
    // Get agent for debugging
    const agent = CSA.runtime.getAgent(agentId);
    console.log('Agent status:', agent.status);
    
    // Check if we should retry
    const capability = agent.brain.assessCapability(task);
    if (capability.capable && capability.confidence > 0.7) {
        console.log('Retrying with confidence:', capability.confidence);
        // Retry logic here
    }
}
```

### Cleanup and Resource Management

```javascript
// Terminate specific agent
await CSA.runtime.terminateAgent(agentId);

// Terminate all agents
await CSA.runtime.terminateAllAgents();

// Clear completed tasks
scheduler.clearCompleted();
scheduler.clearFailed();

// Stop hardware monitoring
CSA.hardware.stopMonitoring();

// Stop scheduler
scheduler.stop();
```

## Performance Tips

1. **Batch operations** when possible
2. **Use OPFS** for large binary data
3. **Monitor memory** before spawning many agents
4. **Leverage WASM** for compute-intensive tasks
5. **Use task scheduler** for background work
6. **Clear old data** regularly
7. **Profile with DevTools** to find bottlenecks

## Debugging

```javascript
// Enable verbose logging (in development)
window.CSA_DEBUG = true;

// Inspect agent state
const agent = CSA.runtime.getAgent(agentId);
console.log('Agent:', {
    id: agent.id,
    status: agent.status,
    created: new Date(agent.created),
    lastActive: new Date(agent.lastActive),
    memory: agent.memory,
    brain: agent.brain.getPerformanceStats('process')
});

// Check system health
console.log('System:', {
    capabilities: CSA.system.getAllCapabilities(),
    hardware: CSA.hardware.getAllMetrics(),
    runtime: CSA.runtime.getStats(),
    storage: await CSA.storage.getStats()
});
```
