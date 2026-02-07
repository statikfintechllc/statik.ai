## SRC/PROTOCOLS DIRECTORY

### **src/protocols/rpc.js**
**Purpose:** Request-response protocol for inter-unit communication  
**Talks To:** bus.u  
**Functions:**
- `createRequest(method, params, timeout=5000)`:
  - Generate request message:
  ```js
  {
    id: 'req_abc123',
    type: 'request',
    method: 'nlp.parse',
    params: {text: 'hello'},
    timeout: 5000,
    timestamp: Date.now()
  }
  ```
- `sendRequest(target, request)`:
  - Emit via bus
  - Wait for response
  - Timeout if no reply
  - Return response or throw TimeoutError
- `createResponse(requestId, result)`:
  - Generate response message:
  ```js
  {
    id: 'res_abc123',
    type: 'response',
    request_id: 'req_abc123',
    result: {intent: 'greeting'},
    timestamp: Date.now()
  }
  ```
- `handleRequest(request, handler)`:
  - Execute handler function
  - Generate response
  - Emit back to requester
**Key Behaviors:**
- Correlation via IDs
- Timeout enforcement
- Error responses (exceptions wrapped)

---

### **src/protocols/stream.js**
**Purpose:** Streaming data protocol  
**Talks To:** bus.u  
**Functions:**
- `createStream(source, topic)`:
  - Return AsyncIterator
  - Yields messages as they arrive
- `publishToStream(streamId, data)`:
  - Emit data chunk to stream
- `closeStream(streamId)`:
  - Signal stream end
- Usage:
  ```js
  const stream = createStream('sensor.motion');
  for await (const data of stream) {
    console.log('Motion:', data);
  }
  ```
**Key Behaviors:**
- Backpressure handling
- Stream multiplexing
- Clean shutdown

---

### **src/protocols/event.js**
**Purpose:** Fire-and-forget event protocol  
**Talks To:** bus.u  
**Functions:**
- `emitEvent(topic, data)`:
  - Fire event, don't wait
  - No response expected
- `subscribeToEvent(topic, callback)`:
  - Register listener
  - Called when event emitted
**Key Behaviors:**
- No blocking
- No guaranteed delivery
- Used for notifications

---

### **src/protocols/handshake.js**
**Purpose:** Unit initialization protocol  
**Talks To:** kernel.u, lifecycle.js  
**Functions:**
- `initiateHandshake(unitId)`:
  - Send: 'unit.init' request
  - Wait for: 'unit.ready' response
  - Timeout: 10s
- `respondHandshake(unitId)`:
  - Unit emits: 'unit.ready'
  - Includes: capabilities, state
- `verifyHandshake(unitId)`:
  - Check unit is responsive
  - Return true/false
**Key Behaviors:**
- Ensures unit properly initialized
- Detects boot failures
- Used by lifecycle.js
