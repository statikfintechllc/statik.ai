# docs/MESSAGES.md - COMPLETE

## Statik.ai Message Flow & Learning Architecture

**Version:** 0.1.0  
**Last Updated:** February 8, 2026

---

## Executive Summary

This document defines the **cognitive message architecture** that enables Statik.ai to understand, learn, and improve from human interaction. Unlike LLM-based systems, Statik.ai uses **rule-based pattern matching** with **continuous delta learning** to build intelligence from scratch.

**Core Principles:**
1. **Zero-coupling:** All units communicate via message bus only
2. **Observable learning:** Every confidence change logged (immutable)
3. **Feedback-driven:** System improves from corrections and outcomes
4. **Memory-informed:** Past interactions shape current responses
5. **Self-modifying:** High-confidence patterns become permanent

**Learning Mechanism:**
- **NOT machine learning** (no neural networks, no training data)
- **Pattern matching** with **confidence scores** (0-1)
- **Delta learning:** Successes increase confidence (+0.05), failures decrease (-0.10)
- **Asymmetric rates:** Faster to doubt than trust (safety-first)
- **Promotion:** Patterns >0.85 for >7 days become "trusted"

---

## Table of Contents

1. [Message Architecture](#message-architecture)
2. [Context Frames](#context-frames)
3. [Pattern Matching System](#pattern-matching-system)
4. [Intent Recognition](#intent-recognition)
5. [Memory-Informed Responses](#memory-informed-responses)
6. [Delta Learning Mechanism](#delta-learning-mechanism)
7. [Complete Message Flows](#complete-message-flows)
8. [Self-Training Process](#self-training-process)
9. [Feedback Loops](#feedback-loops)
10. [Pattern Evolution](#pattern-evolution)
11. [Error Correction](#error-correction)
12. [Consolidation & Optimization](#consolidation--optimization)
13. [Performance Metrics](#performance-metrics)

---

## Message Architecture

### Bus Topology

**Zero-coupling design:** Units never import each other

```javascript
// ❌ WRONG - Direct coupling
import { NLPUnit } from './nlp.u.js';
const nlp = new NLPUnit();
const result = nlp.parseIntent(text);

// ✅ CORRECT - Bus messaging
bus.emit('nlp.parse', { text });
bus.on('nlp.parsed', (result) => {
  // Handle result
});
```

### Message Structure

**All messages follow standard format:**

```javascript
{
  id: 'msg_1738777200_abc123',        // Unique message ID
  timestamp: 1738777200000,           // Unix timestamp (ms)
  source: 'pce.u',                    // Originating unit
  target: 'nlp.u',                    // Target unit (or '*' for broadcast)
  type: 'nlp.parse',                  // Message type (bus topic)
  correlation_id: 'req_xyz',          // For request-response (optional)
  payload: {                          // Message data
    // Type-specific data
  },
  metadata: {                         // Optional metadata
    priority: 'normal',               // Priority level
    timeout: 5000,                    // Timeout (ms)
    retry: false                      // Retry on failure
  }
}
```

### Message Validation

**All messages validated against schemas:**

```javascript
// src/bus/validator.js
export class Validator {
  validate(topic, payload) {
    const schema = this.schemas.get(topic);
    if (!schema) {
      return { valid: true }; // No schema = no validation
    }
    
    const errors = this.validateAgainstSchema(payload, schema);
    if (errors.length > 0) {
      return { valid: false, errors };
    }
    
    return { valid: true };
  }
  
  validateAgainstSchema(data, schema) {
    // JSON Schema validation
    // Returns array of error messages
  }
}
```

**Example schema:**

```json
// schemas/messages/context.schema.json
{
  "type": "object",
  "required": ["id", "timestamp", "raw", "tokens"],
  "properties": {
    "id": { "type": "string", "pattern": "^ctx_" },
    "timestamp": { "type": "number" },
    "raw": { "type": "string", "minLength": 1 },
    "tokens": {
      "type": "array",
      "items": { "type": "string" },
      "minItems": 1
    },
    "novelty_score": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    }
  }
}
```

---

## Context Frames

### ContextFrame Structure

**The fundamental unit of perception:**

```javascript
{
  // Identity
  id: 'ctx_1738777200_abc123',
  timestamp: 1738777200000,
  source: 'ui.input',
  
  // Content
  raw: 'What is my trading balance?',
  tokens: ['what', 'is', 'my', 'trading', 'balance'],
  
  // Analysis
  novelty_score: 0.85,           // 0-1, higher = more novel
  token_count: 5,
  char_count: 29,
  
  // Attention (added by as.u)
  salience: 0.92,                // 0-1, higher = more important
  attention_reasons: [
    { factor: 'novelty', weight: 0.3, score: 0.85 },
    { factor: 'urgency', weight: 0.4, score: 0.95 },
    { factor: 'goal_alignment', weight: 0.2, score: 0.90 }
  ],
  
  // Temporal (added by ti.u)
  sequence_num: 1234,
  session_id: 'session_abc',
  prev_context_id: 'ctx_1738777190_xyz',
  time_since_last: 10000,        // ms
  causal_chain: ['ctx_xyz', 'ctx_abc', 'ctx_current'],
  
  // Intent (added by nlp.u)
  intent: 'query.balance',
  confidence: 0.82,
  entities: [
    { type: 'subject', value: 'balance', span: [19, 26] },
    { type: 'domain', value: 'trading', span: [11, 18] }
  ],
  
  // Memory (added by cm.u)
  related_memories: ['ep_123', 'ep_456'],
  memory_count: 2,
  
  // Response (added by nlp.u)
  response: 'Your trading balance is $1,234.56',
  response_template: 'respond.balance',
  response_confidence: 0.88
}
```

### ContextFrame Lifecycle

```
1. CREATION (pce.u)
   - User input arrives
   - Tokenize, hash, calculate novelty
   - Emit: context.new

2. FILTERING (as.u)
   - Calculate salience
   - If salience > 0.5 → emit: context.salient
   - If salience ≤ 0.5 → drop (too low priority)

3. INTEGRATION (ti.u)
   - Add sequence number, session ID
   - Link to previous contexts
   - Build causal chain
   - Emit: context.temporal

4. UNDERSTANDING (nlp.u)
   - Match against patterns
   - Extract intent + entities
   - Retrieve related memories
   - Compose response
   - Emit: ui.render

5. STORAGE (cm.u)
   - Convert to Episode
   - Store in IndexedDB
   - Emit: memory.stored

6. EVALUATION (ee.u)
   - Track outcome (user reaction)
   - Compare to prediction
   - Emit: error.detected OR success.confirmed

7. LEARNING (dbt.u)
   - Adjust pattern confidence
   - Log delta
   - Emit: learning.delta
```

---

## Pattern Matching System

### Pattern Structure

**Patterns are regex-based rules with confidence scores:**

```javascript
{
  id: 'pattern_greeting_casual',
  category: 'greeting',
  trigger: {
    regex: /^(hi|hey|hello|sup|yo)\b/i,
    tokens_required: ['greeting_word'],
    context: null  // No context requirement
  },
  response: {
    template: 'greeting_casual',
    slots: [],
    confidence: 0.75  // Current confidence (updated by learning)
  },
  metadata: {
    created: 1738600000000,
    last_used: 1738777000000,
    success_count: 234,
    failure_count: 12,
    confidence_history: [
      { timestamp: 1738600000000, confidence: 0.50 },
      { timestamp: 1738650000000, confidence: 0.60 },
      { timestamp: 1738700000000, confidence: 0.70 },
      { timestamp: 1738750000000, confidence: 0.75 }
    ]
  }
}
```

### Pattern Registry

**nlp.u maintains pattern registry in memory:**

```javascript
// src/units/nlp.u.js
export default class NLPUnit {
  constructor(bus) {
    this.bus = bus;
    this.patterns = new Map(); // pattern_id → pattern
    this.responseTemplates = new Map(); // template_id → template
  }
  
  async init() {
    // Load patterns from saved state OR defaults
    await this.loadPatterns();
    
    // Subscribe to parse requests
    this.bus.on('nlp.parse', (data) => this.parseIntent(data.text, data.context));
    
    // Subscribe to learning updates
    this.bus.on('learning.pattern_update', (data) => this.updatePattern(data));
  }
  
  async loadPatterns() {
    // Try loading from saved state
    const saved = await db.loadUnitState('nlp.u');
    if (saved?.patterns) {
      this.patterns = new Map(saved.patterns);
      console.log('[nlp.u] Loaded', this.patterns.size, 'patterns');
      return;
    }
    
    // Fallback: Load default patterns
    const defaults = await fetch('/configs/nlp-patterns-default.json').then(r => r.json());
    for (const pattern of defaults.patterns) {
      this.patterns.set(pattern.id, pattern);
    }
    console.log('[nlp.u] Loaded', this.patterns.size, 'default patterns');
  }
  
  getState() {
    return {
      patterns: Array.from(this.patterns.entries())
    };
  }
}
```

### Pattern Matching Algorithm

```javascript
parseIntent(text, context) {
  const tokens = this.tokenize(text);
  const matches = [];
  
  // Try each pattern
  for (const [id, pattern] of this.patterns) {
    const score = this.scorePattern(text, tokens, pattern, context);
    if (score > 0) {
      matches.push({ pattern_id: id, pattern, score });
    }
  }
  
  // Sort by score (confidence × match quality)
  matches.sort((a, b) => b.score - a.score);
  
  if (matches.length === 0) {
    return {
      intent: 'unknown',
      confidence: 0,
      entities: [],
      pattern_id: null
    };
  }
  
  // Best match
  const best = matches[0];
  
  return {
    intent: best.pattern.response.template,
    confidence: best.score,
    entities: this.extractEntities(text, best.pattern),
    pattern_id: best.pattern_id,
    alternatives: matches.slice(1, 3) // Top 3 alternatives
  };
}

scorePattern(text, tokens, pattern, context) {
  let score = 0;
  
  // 1. Regex match
  if (pattern.trigger.regex) {
    if (!pattern.trigger.regex.test(text)) {
      return 0; // No match
    }
    score += 0.5; // Base score for regex match
  }
  
  // 2. Token match
  if (pattern.trigger.tokens_required) {
    const tokenMatches = pattern.trigger.tokens_required.filter(req =>
      tokens.some(t => t.toLowerCase() === req.toLowerCase())
    );
    score += (tokenMatches.length / pattern.trigger.tokens_required.length) * 0.3;
  }
  
  // 3. Context match
  if (pattern.trigger.context) {
    if (this.matchesContext(context, pattern.trigger.context)) {
      score += 0.2;
    } else {
      return 0; // Context required but not matched
    }
  }
  
  // 4. Pattern confidence (learned)
  score *= pattern.response.confidence;
  
  return score;
}
```

### Default Patterns

**Shipped with system (configs/nlp-patterns-default.json):**

```json
{
  "patterns": [
    {
      "id": "pattern_greeting_casual",
      "category": "greeting",
      "trigger": {
        "regex": "^(hi|hey|hello|sup|yo)\\b",
        "tokens_required": null,
        "context": null
      },
      "response": {
        "template": "greeting_casual",
        "confidence": 0.50
      }
    },
    {
      "id": "pattern_greeting_formal",
      "category": "greeting",
      "trigger": {
        "regex": "^(good morning|good afternoon|good evening|greetings)\\b",
        "tokens_required": null,
        "context": null
      },
      "response": {
        "template": "greeting_formal",
        "confidence": 0.50
      }
    },
    {
      "id": "pattern_query_balance",
      "category": "query",
      "trigger": {
        "regex": "\\b(what|show|tell).*(balance|money|funds)\\b",
        "tokens_required": ["balance"],
        "context": { "domain": "trading" }
      },
      "response": {
        "template": "respond.balance",
        "confidence": 0.50
      }
    },
    {
      "id": "pattern_command_transfer",
      "category": "command",
      "trigger": {
        "regex": "\\b(transfer|send|move).*\\$?\\d+",
        "tokens_required": ["transfer", "amount"],
        "context": { "domain": "trading" }
      },
      "response": {
        "template": "command.transfer",
        "confidence": 0.50
      }
    },
    {
      "id": "pattern_query_help",
      "category": "query",
      "trigger": {
        "regex": "\\b(help|how do i|how to|what can you do)\\b",
        "tokens_required": null,
        "context": null
      },
      "response": {
        "template": "respond.help",
        "confidence": 0.50
      }
    }
  ]
}
```

**Note:** All patterns start at 0.50 confidence (neutral). Learning adjusts from there.

---

## Intent Recognition

### Intent Extraction

```javascript
// From parsed result
const intent = {
  type: 'query.balance',           // Intent type
  confidence: 0.82,                // Confidence (0-1)
  pattern_id: 'pattern_query_balance',
  entities: [                      // Extracted entities
    {
      type: 'subject',
      value: 'balance',
      span: [19, 26],              // Character positions
      confidence: 0.95
    },
    {
      type: 'domain',
      value: 'trading',
      span: [11, 18],
      confidence: 0.88
    }
  ],
  slots: {                         // Normalized entities
    subject: 'balance',
    domain: 'trading'
  }
};
```

### Entity Extraction

**Simple regex-based extraction:**

```javascript
extractEntities(text, pattern) {
  const entities = [];
  
  // Common entity types
  
  // 1. Monetary amounts
  const moneyRegex = /\$?([\d,]+\.?\d*)/g;
  let match;
  while ((match = moneyRegex.exec(text)) !== null) {
    entities.push({
      type: 'amount',
      value: parseFloat(match[1].replace(',', '')),
      span: [match.index, match.index + match[0].length],
      confidence: 0.95
    });
  }
  
  // 2. Names (capitalized words)
  const nameRegex = /\b([A-Z][a-z]+)\b/g;
  while ((match = nameRegex.exec(text)) !== null) {
    entities.push({
      type: 'name',
      value: match[1],
      span: [match.index, match.index + match[0].length],
      confidence: 0.70
    });
  }
  
  // 3. Dates
  const dateRegex = /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})\b/g;
  while ((match = dateRegex.exec(text)) !== null) {
    entities.push({
      type: 'date',
      value: match[1],
      span: [match.index, match.index + match[0].length],
      confidence: 0.90
    });
  }
  
  // 4. Pattern-specific entities
  if (pattern.entities) {
    for (const entityDef of pattern.entities) {
      const regex = new RegExp(entityDef.regex, 'gi');
      while ((match = regex.exec(text)) !== null) {
        entities.push({
          type: entityDef.type,
          value: match[1] || match[0],
          span: [match.index, match.index + match[0].length],
          confidence: entityDef.confidence || 0.80
        });
      }
    }
  }
  
  return entities;
}
```

---

## Memory-Informed Responses

### Memory Retrieval

**When composing response, retrieve relevant memories:**

```javascript
async composeResponse(intent, slots, context) {
  // 1. Retrieve relevant memories
  const query = this.buildMemoryQuery(intent, slots);
  const memories = await cm.retrieveMemories(query, 5);
  
  // 2. Get response template
  const template = this.responseTemplates.get(intent.type);
  if (!template) {
    return this.fallbackResponse();
  }
  
  // 3. Fill template with slots + memory context
  const response = this.fillTemplate(template, slots, memories);
  
  return response;
}

buildMemoryQuery(intent, slots) {
  // Build search query from intent
  const keywords = [];
  
  // Add intent type as keyword
  keywords.push(intent.type.split('.')[1]); // 'balance' from 'query.balance'
  
  // Add entity values as keywords
  for (const [key, value] of Object.entries(slots)) {
    if (typeof value === 'string') {
      keywords.push(value);
    }
  }
  
  return keywords.join(' ');
}

fillTemplate(template, slots, memories) {
  let response = template.text;
  
  // Replace slot placeholders
  for (const [key, value] of Object.entries(slots)) {
    response = response.replace(`{${key}}`, value);
  }
  
  // Add memory context (if template supports it)
  if (template.include_memory && memories.length > 0) {
    const memoryText = memories
      .map(m => m.content)
      .join(' ');
    response += `\n\n(Based on: ${memoryText})`;
  }
  
  return response;
}
```

### Response Templates

**Template structure:**

```javascript
{
  id: 'respond.balance',
  text: 'Your {domain} balance is ${amount}',
  slots: ['domain', 'amount'],
  include_memory: false,
  variants: [
    'Your {domain} account has ${amount}',
    '${amount} in your {domain} account'
  ],
  confidence: 0.75
}
```

**Example response composition:**

```javascript
// Input
intent = { type: 'query.balance', confidence: 0.82 }
slots = { domain: 'trading', amount: 1234.56 }
memories = [
  { content: 'Last checked balance was $1200', salience: 0.85 },
  { content: 'User frequently checks trading balance', salience: 0.70 }
]

// Output
response = 'Your trading balance is $1,234.56'
```

---

## Delta Learning Mechanism

### Learning Algorithm

**Core formula:**

```javascript
if (outcome === 'success') {
  confidence_new = Math.min(1.0, confidence_old + 0.05);
} else if (outcome === 'failure') {
  confidence_new = Math.max(0.0, confidence_old - 0.10);
}
```

**Asymmetric rates:**
- Success: +0.05 (slow to trust)
- Failure: -0.10 (fast to doubt)
- **Rationale:** Safety-first. Better to be uncertain than overconfident.

### Delta Structure

```javascript
{
  id: 'delta_1738777200_abc',
  timestamp: 1738777200000,
  type: 'pattern.confidence',
  target_id: 'pattern_greeting_casual',
  before: 0.65,
  after: 0.70,
  change: +0.05,
  evidence: 'ctx_xyz',              // Context ID that triggered change
  reason: 'user_positive_response', // Human-readable reason
  outcome: 'success',               // 'success' or 'failure'
  evaluator: 'ee.u'                 // Unit that triggered learning
}
```

### Learning Triggers

**What causes learning:**

1. **User correction:**
   ```
   System: "Your balance is $1,234.56"
   User: "Actually, show me the portfolio value"
   → Pattern confidence decreased (wrong intent)
   ```

2. **Successful action:**
   ```
   System: "Transferring $100 to Alice"
   [Action executes successfully]
   → Pattern confidence increased (correct intent)
   ```

3. **Repeated pattern:**
   ```
   User: "Hey" → "Hey" → "Hey" (3 times)
   System: "Hi!" (each time)
   [No correction from user]
   → Pattern confidence increased (consistently correct)
   ```

4. **Prediction match:**
   ```
   ee.u predicts: User will confirm transfer
   User: "Yes, transfer it"
   → Prediction correct → Pattern confidence increased
   ```

### Learning Implementation

```javascript
// src/units/dbt.u.js
export default class DeltaLearningUnit {
  constructor(bus) {
    this.bus = bus;
  }
  
  async init() {
    // Subscribe to evaluation outcomes
    this.bus.on('error.detected', (data) => this.handleFailure(data));
    this.bus.on('success.confirmed', (data) => this.handleSuccess(data));
    
    // Subscribe to user corrections
    this.bus.on('user.correction', (data) => this.handleCorrection(data));
  }
  
  async handleSuccess(data) {
    const { pattern_id, context_id } = data;
    
    // Get current pattern
    const pattern = await this.getPattern(pattern_id);
    if (!pattern) return;
    
    // Calculate new confidence
    const before = pattern.response.confidence;
    const after = Math.min(1.0, before + 0.05);
    
    // Log delta
    await this.logDelta({
      type: 'pattern.confidence',
      target_id: pattern_id,
      before,
      after,
      change: +0.05,
      evidence: context_id,
      reason: 'successful_pattern_match',
      outcome: 'success'
    });
    
    // Update pattern in nlp.u
    this.bus.emit('learning.pattern_update', {
      pattern_id,
      confidence: after
    });
    
    // Emit learning event
    this.bus.emit('learning.delta', {
      pattern_id,
      confidence_change: +0.05,
      new_confidence: after
    });
  }
  
  async handleFailure(data) {
    const { pattern_id, context_id, error_type } = data;
    
    const pattern = await this.getPattern(pattern_id);
    if (!pattern) return;
    
    const before = pattern.response.confidence;
    const after = Math.max(0.0, before - 0.10);
    
    await this.logDelta({
      type: 'pattern.confidence',
      target_id: pattern_id,
      before,
      after,
      change: -0.10,
      evidence: context_id,
      reason: error_type,
      outcome: 'failure'
    });
    
    this.bus.emit('learning.pattern_update', {
      pattern_id,
      confidence: after
    });
    
    this.bus.emit('learning.delta', {
      pattern_id,
      confidence_change: -0.10,
      new_confidence: after
    });
  }
  
  async logDelta(delta) {
    // Append to immutable log
    await db.storeDelta({
      id: generateId('delta'),
      timestamp: Date.now(),
      ...delta
    });
  }
}
```

---

## Complete Message Flows

### Flow 1: Simple Question-Answer

```
[USER TYPES]
"What is my balance?"

↓ [UI]
bus.emit('ui.input', { text: 'What is my balance?' })

↓ [pce.u receives ui.input]
1. Tokenize: ['what', 'is', 'my', 'balance']
2. Calculate novelty: 0.65 (seen similar before)
3. Create ContextFrame
4. bus.emit('context.new', ContextFrame)

↓ [as.u receives context.new]
1. Calculate salience:
   - Novelty: 0.65 × 0.3 = 0.195
   - Urgency: 0.8 × 0.4 = 0.32 (question = urgent)
   - Goal alignment: 0.7 × 0.2 = 0.14
   - Total: 0.655 > 0.5 threshold
2. bus.emit('context.salient', ContextFrame)

↓ [ti.u receives context.salient]
1. Add sequence number: 1234
2. Link to previous: 'ctx_previous'
3. Time since last: 30000ms
4. bus.emit('context.temporal', ContextFrame)

↓ [PARALLEL BRANCH: cm.u receives context.temporal]
1. Convert to Episode
2. Store in IndexedDB (async via worker)
3. bus.emit('memory.stored', { episode_id })

↓ [MAIN BRANCH: nlp.u receives context.temporal]
1. Match patterns:
   - pattern_query_balance: score 0.75
   - pattern_greeting_casual: score 0.12
   - Best: pattern_query_balance
2. Extract entities:
   - subject: 'balance'
3. Retrieve memories:
   - Query: "balance"
   - Results: 2 episodes about balance
4. Compose response:
   - Template: "Your balance is ${amount}"
   - Lookup balance (mock: $1,234.56)
   - Fill: "Your balance is $1,234.56"
5. bus.emit('ui.render', {
     content: 'Your balance is $1,234.56',
     pattern_id: 'pattern_query_balance',
     confidence: 0.75
   })

↓ [ui.u receives ui.render]
1. Append to chat: "Your balance is $1,234.56"
2. Display confidence: (hidden, for dev inspector)

↓ [gm.u receives context.temporal]
1. Create goal: respond.query
2. Priority: 10 (high, user question)
3. bus.emit('goal.new', Goal)

↓ [ie.u receives goal.new]
1. Goal type: respond.query
2. Check sa.u: Can system query balance? Yes
3. Check ec.u: Is query allowed? Yes
4. Predict outcome: User will be satisfied
5. Execute: Already handled by nlp.u
6. bus.emit('action.completed', {
     goal_id,
     success: true,
     predicted_outcome: 'satisfied'
   })

↓ [ee.u receives action.completed]
1. Record prediction: 'satisfied'
2. Wait for actual outcome...

↓ [USER REACTS]
[No correction, continues conversation]
→ Implies success

↓ [ee.u detects implicit success]
1. Outcome: 'satisfied' (no correction)
2. Prediction: 'satisfied'
3. Match: TRUE
4. bus.emit('success.confirmed', {
     pattern_id: 'pattern_query_balance',
     context_id: 'ctx_xyz'
   })

↓ [dbt.u receives success.confirmed]
1. Get pattern: pattern_query_balance
2. Current confidence: 0.75
3. New confidence: min(1.0, 0.75 + 0.05) = 0.80
4. Log delta:
   {
     type: 'pattern.confidence',
     target_id: 'pattern_query_balance',
     before: 0.75,
     after: 0.80,
     evidence: 'ctx_xyz',
     outcome: 'success'
   }
5. bus.emit('learning.pattern_update', {
     pattern_id: 'pattern_query_balance',
     confidence: 0.80
   })

↓ [nlp.u receives learning.pattern_update]
1. Update pattern in registry:
   patterns.get('pattern_query_balance').response.confidence = 0.80
2. Pattern now 5% more confident

✓ [COMPLETE]
Total time: ~150ms
Pattern confidence: 0.75 → 0.80
```

---

### Flow 2: User Correction (Learning)

```
[USER TYPES]
"Show me my portfolio"

↓ [pce.u → as.u → ti.u → nlp.u]
(Same as Flow 1)

↓ [nlp.u misinterprets]
1. Pattern match: pattern_query_balance (0.65 confidence)
   - Regex: \b(show|tell).*(balance|portfolio)\b
   - Matches "show" and "portfolio"
   - But "portfolio" ≠ "balance" (should be different intent)
2. Response: "Your balance is $1,234.56"
3. bus.emit('ui.render', { content, pattern_id: 'pattern_query_balance' })

↓ [UI DISPLAYS]
"Your balance is $1,234.56"

↓ [USER CORRECTS]
"No, I want to see the portfolio breakdown"

↓ [pce.u detects correction]
1. Previous context: ctx_xyz (balance query)
2. Current context: ctx_abc (portfolio query)
3. Detect correction pattern:
   - Starts with "No" / "Actually" / "I meant"
   - Time delta < 30s from previous
4. bus.emit('user.correction', {
     original_context: 'ctx_xyz',
     correction_context: 'ctx_abc',
     failed_pattern: 'pattern_query_balance',
     reason: 'wrong_intent'
   })

↓ [dbt.u receives user.correction]
1. Get pattern: pattern_query_balance
2. Current confidence: 0.65
3. New confidence: max(0.0, 0.65 - 0.10) = 0.55
4. Log delta:
   {
     type: 'pattern.confidence',
     target_id: 'pattern_query_balance',
     before: 0.65,
     after: 0.55,
     change: -0.10,
     evidence: 'ctx_abc',
     reason: 'user_correction_wrong_intent',
     outcome: 'failure'
   }
5. bus.emit('learning.pattern_update', {
     pattern_id: 'pattern_query_balance',
     confidence: 0.55
   })

↓ [nlp.u receives learning.pattern_update]
1. Update pattern:
   patterns.get('pattern_query_balance').response.confidence = 0.55
2. Pattern now 10% LESS confident

↓ [nlp.u also creates new pattern]
1. Detect: "show me my portfolio" is a NEW intent
2. Create pattern:
   {
     id: 'pattern_query_portfolio',
     trigger: { regex: /\b(show|display).*(portfolio)\b/i },
     response: { template: 'respond.portfolio', confidence: 0.50 }
   }
3. Save to registry

↓ [nlp.u re-processes correction]
1. Match patterns against "show me my portfolio"
2. New pattern matches: 0.50 confidence
3. Old pattern matches: 0.55 confidence (but lower than before)
4. Best match: pattern_query_portfolio (new)
5. Response: "Here's your portfolio breakdown: [...]"
6. bus.emit('ui.render', { content, pattern_id: 'pattern_query_portfolio' })

✓ [RESULT]
- Old pattern penalized: 0.65 → 0.55
- New pattern created: confidence 0.50
- System learned: "portfolio" ≠ "balance"
- Next time "portfolio" asked → correct pattern used
```

---

### Flow 3: Memory-Informed Response

```
[CONTEXT: User previously said "I trade tech stocks"]

[USER TYPES]
"What should I buy?"

↓ [pce.u → as.u → ti.u]
(Standard pipeline)

↓ [nlp.u receives context.temporal]
1. Match patterns:
   - pattern_query_recommendation: 0.70
2. Extract entities: None (generic query)
3. **Retrieve memories:**
   - Query: "buy recommendation"
   - Results:
     [
       { content: 'I trade tech stocks', salience: 0.85, timestamp: yesterday },
       { content: 'User follows NASDAQ', salience: 0.75, timestamp: 2 days ago }
     ]
4. Compose response WITH memory context:
   - Template: "Based on your interests, consider..."
   - Memory context: User trades tech stocks, follows NASDAQ
   - Response: "Based on your tech stock interests, consider researching companies in the NASDAQ tech sector. I can help analyze specific stocks if you name them."
5. bus.emit('ui.render', {
     content: <response>,
     pattern_id: 'pattern_query_recommendation',
     confidence: 0.70,
     memory_used: true,
     memory_ids: ['ep_123', 'ep_456']
   })

↓ [UI DISPLAYS]
"Based on your tech stock interests, consider researching companies in the NASDAQ tech sector. I can help analyze specific stocks if you name them."

↓ [USER RESPONSE]
"Great, thanks!"
→ Positive feedback

↓ [ee.u detects success]
1. Outcome: positive ('great', 'thanks')
2. Pattern used memories: TRUE
3. bus.emit('success.confirmed', {
     pattern_id: 'pattern_query_recommendation',
     memory_assisted: true
   })

↓ [dbt.u receives success.confirmed]
1. Pattern confidence: 0.70 → 0.75
2. **ALSO: Boost memory salience**
   - Episodes ep_123, ep_456 were useful
   - Increase salience: 0.85 → 0.90, 0.75 → 0.80
3. Log delta for pattern AND memories

✓ [RESULT]
- Pattern confidence increased
- Useful memories promoted (higher salience)
- Future queries more likely to retrieve these memories
```

---

## Self-Training Process

### Training Lifecycle

**Phase 1: Initial State (Fresh Install)**
- All patterns at 0.50 confidence (neutral)
- No memories
- No learning history
- Blank slate

**Phase 2: Early Learning (First 100 interactions)**
- Patterns adjust rapidly
- System discovers which patterns work
- Memory begins accumulating
- Delta log populates

**Phase 3: Stabilization (100-1000 interactions)**
- Confidence scores converge
- Successful patterns → 0.80-0.90
- Failed patterns → 0.20-0.30
- Memory-informed responses improve

**Phase 4: Optimization (1000+ interactions)**
- High-confidence patterns (>0.85) become "trusted"
- Low-confidence patterns (<0.20) deprecated
- New patterns created from user corrections
- System "knows" user's communication style

### Consolidation

**Periodic memory consolidation (hc.u triggers daily):**

```javascript
// src/units/cm.u.js
async consolidateMemories() {
  console.log('[cm.u] Starting consolidation...');
  
  // 1. Merge similar episodes
  const episodes = await db.getAllEpisodes();
  const clusters = this.clusterSimilarEpisodes(episodes);
  
  for (const cluster of clusters) {
    if (cluster.length > 3) {
      // Create consolidated episode
      const consolidated = this.mergeEpisodes(cluster);
      await db.storeEpisode(consolidated);
      
      // Delete originals
      for (const ep of cluster) {
        await db.deleteEpisode(ep.id);
      }
    }
  }
  
  // 2. Strengthen frequently accessed memories
  const accessed = await db.getEpisodesByAccessCount(10); // Top 10
  for (const episode of accessed) {
    episode.salience = Math.min(1.0, episode.salience + 0.05);
    await db.updateEpisode(episode);
  }
  
  // 3. Prune low-salience old memories
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
  const old = await db.getEpisodes({
    timestamp_to: cutoff,
    salience_max: 0.3
  });
  for (const episode of old) {
    await db.deleteEpisode(episode.id);
  }
  
  console.log('[cm.u] Consolidation complete');
}

clusterSimilarEpisodes(episodes) {
  // TF-IDF + cosine similarity
  // Group episodes with similarity > 0.8
  const clusters = [];
  const visited = new Set();
  
  for (let i = 0; i < episodes.length; i++) {
    if (visited.has(i)) continue;
    
    const cluster = [episodes[i]];
    visited.add(i);
    
    for (let j = i + 1; j < episodes.length; j++) {
      if (visited.has(j)) continue;
      
      const similarity = this.calculateSimilarity(episodes[i], episodes[j]);
      if (similarity > 0.8) {
        cluster.push(episodes[j]);
        visited.add(j);
      }
    }
    
    clusters.push(cluster);
  }
  
  return clusters;
}

mergeEpisodes(episodes) {
  return {
    id: generateId('ep'),
    timestamp: Math.max(...episodes.map(e => e.timestamp)),
    raw: episodes.map(e => e.raw).join(' | '),
    tokens: [...new Set(episodes.flatMap(e => e.tokens))],
    salience: Math.max(...episodes.map(e => e.salience)),
    frequency: episodes.reduce((sum, e) => sum + e.frequency, 0),
    tags: [...new Set(episodes.flatMap(e => e.tags))],
    merged_from: episodes.map(e => e.id),
    merged: true
  };
}
```

---

## Feedback Loops

### Loop 1: Immediate Feedback (User Correction)

```
User Input
    ↓
System Response (wrong)
    ↓
User Correction
    ↓
Pattern Confidence Decreased
    ↓
New Pattern Created
    ↓
Correct Response
    ↓
Pattern Confidence Increased
```

### Loop 2: Implicit Feedback (Outcome Evaluation)

```
System Predicts Outcome
    ↓
Action Executed
    ↓
Actual Outcome Observed
    ↓
Compare Prediction vs Actual
    ↓
IF Match: Confidence Increased
IF Mismatch: Confidence Decreased
```

### Loop 3: Memory-Assisted Learning

```
Query Received
    ↓
Retrieve Memories
    ↓
Memory-Informed Response
    ↓
IF Successful: Boost Memory Salience
IF Failed: Reduce Memory Salience
    ↓
Future Queries Use Updated Salience
```

---

## Pattern Evolution

### Confidence Trajectory

**Example: pattern_greeting_casual**

```
Day 1:  0.50 (default)
Day 2:  0.55 (1 success)
Day 3:  0.60 (1 success)
Day 4:  0.50 (1 failure - user said "That's too casual")
Day 5:  0.55 (1 success)
Day 10: 0.75 (consistent successes)
Day 20: 0.85 (high confidence, promoted to "trusted")
```

### Promotion to "Trusted"

**Criteria:**
- Confidence > 0.85
- Maintained for > 7 days
- No recent failures

**Effect:**
- Pattern marked as "trusted"
- Higher priority in matching
- Less susceptible to one-off failures (requires 3 failures to drop below 0.85)

```javascript
// dbt.u checks for promotion daily
async checkForPromotions() {
  const patterns = await nlp.getAllPatterns();
  
  for (const pattern of patterns) {
    if (pattern.response.confidence > 0.85 && !pattern.trusted) {
      // Check stability (no failures in last 7 days)
      const recentDeltas = await db.getDeltas({
        target_id: pattern.id,
        timestamp_from: Date.now() - 7 * 24 * 60 * 60 * 1000
      });
      
      const hasFailures = recentDeltas.some(d => d.outcome === 'failure');
      if (!hasFailures) {
        // Promote to trusted
        pattern.trusted = true;
        pattern.promoted_at = Date.now();
        
        await nlp.updatePattern(pattern);
        
        bus.emit('learning.pattern_promoted', {
          pattern_id: pattern.id,
          confidence: pattern.response.confidence
        });
        
        console.log(`[dbt.u] Promoted ${pattern.id} to trusted`);
      }
    }
  }
}
```

### Deprecation

**Criteria:**
- Confidence < 0.20
- No successes in > 30 days

**Effect:**
- Pattern marked as "deprecated"
- Removed from active matching
- Kept in archive (delta log preserves history)

```javascript
async checkForDeprecation() {
  const patterns = await nlp.getAllPatterns();
  
  for (const pattern of patterns) {
    if (pattern.response.confidence < 0.20 && !pattern.deprecated) {
      // Check if any recent successes
      const recentDeltas = await db.getDeltas({
        target_id: pattern.id,
        timestamp_from: Date.now() - 30 * 24 * 60 * 60 * 1000,
        outcome: 'success'
      });
      
      if (recentDeltas.length === 0) {
        // Deprecate
        pattern.deprecated = true;
        pattern.deprecated_at = Date.now();
        
        await nlp.updatePattern(pattern);
        
        bus.emit('learning.pattern_deprecated', {
          pattern_id: pattern.id,
          confidence: pattern.response.confidence
        });
        
        console.log(`[dbt.u] Deprecated ${pattern.id}`);
      }
    }
  }
}
```

---

## Error Correction

### Prediction Mismatch Detection

```javascript
// src/units/ee.u.js
export default class EvaluationUnit {
  constructor(bus) {
    this.bus = bus;
    this.predictions = new Map(); // action_id → predicted_outcome
  }
  
  async init() {
    this.bus.on('action.execute', (data) => this.recordPrediction(data));
    this.bus.on('action.completed', (data) => this.evaluateOutcome(data));
  }
  
  recordPrediction(data) {
    const { action_id, predicted_outcome } = data;
    this.predictions.set(action_id, {
      predicted: predicted_outcome,
      timestamp: Date.now(),
      context_id: data.context_id,
      pattern_id: data.pattern_id
    });
  }
  
  evaluateOutcome(data) {
    const { action_id, actual_outcome } = data;
    const prediction = this.predictions.get(action_id);
    
    if (!prediction) return;
    
    // Compare
    const match = this.compareOutcomes(prediction.predicted, actual_outcome);
    
    if (match) {
      // Success
      this.bus.emit('success.confirmed', {
        action_id,
        pattern_id: prediction.pattern_id,
        context_id: prediction.context_id
      });
    } else {
      // Mismatch
      this.bus.emit('error.detected', {
        action_id,
        pattern_id: prediction.pattern_id,
        context_id: prediction.context_id,
        error_type: 'prediction_mismatch',
        predicted: prediction.predicted,
        actual: actual_outcome,
        severity: this.calculateSeverity(prediction.predicted, actual_outcome)
      });
    }
    
    // Clean up
    this.predictions.delete(action_id);
  }
  
  compareOutcomes(predicted, actual) {
    // Fuzzy matching (not exact string comparison)
    if (predicted === actual) return true;
    
    // Semantic similarity (simple keyword overlap)
    const predTokens = predicted.toLowerCase().split(/\s+/);
    const actTokens = actual.toLowerCase().split(/\s+/);
    const overlap = predTokens.filter(t => actTokens.includes(t));
    
    return overlap.length / predTokens.length > 0.5; // 50% overlap = match
  }
  
  calculateSeverity(predicted, actual) {
    // 1-10 scale
    // Total mismatch = 8-10 (high severity)
    // Partial mismatch = 4-7 (medium)
    // Close match = 1-3 (low)
    
    const overlap = this.compareOutcomes(predicted, actual);
    if (overlap) return 2; // Low (basically matched)
    
    // Check if opposite (e.g., predicted 'success', got 'failure')
    if ((predicted.includes('success') && actual.includes('failure')) ||
        (predicted.includes('failure') && actual.includes('success'))) {
      return 9; // High (opposite)
    }
    
    return 6; // Medium (different but not opposite)
  }
}
```

---

## Consolidation & Optimization

### Pattern Consolidation

**Merge similar patterns:**

```javascript
async consolidatePatterns() {
  const patterns = await nlp.getAllPatterns();
  
  // Find similar patterns
  for (let i = 0; i < patterns.length; i++) {
    for (let j = i + 1; j < patterns.length; j++) {
      const similarity = this.comparePatterns(patterns[i], patterns[j]);
      
      if (similarity > 0.8) {
        // Merge
        const merged = this.mergePatterns(patterns[i], patterns[j]);
        await nlp.updatePattern(merged);
        await nlp.deletePattern(patterns[j].id);
        
        console.log(`[cm.u] Merged ${patterns[j].id} into ${patterns[i].id}`);
      }
    }
  }
}

comparePatterns(p1, p2) {
  // Compare regex patterns
  const regex1 = p1.trigger.regex.source;
  const regex2 = p2.trigger.regex.source;
  
  // Calculate edit distance
  const distance = this.levenshteinDistance(regex1, regex2);
  const maxLen = Math.max(regex1.length, regex2.length);
  
  return 1 - (distance / maxLen); // 0-1 similarity
}

mergePatterns(p1, p2) {
  // Keep higher confidence pattern as base
  const base = p1.response.confidence > p2.response.confidence ? p1 : p2;
  const other = p1 === base ? p2 : p1;
  
  // Combine regex (OR logic)
  base.trigger.regex = new RegExp(
    `(${base.trigger.regex.source})|(${other.trigger.regex.source})`,
    'i'
  );
  
  // Average confidence (weighted by usage)
  const total = base.metadata.success_count + other.metadata.success_count;
  base.response.confidence = (
    (base.response.confidence * base.metadata.success_count) +
    (other.response.confidence * other.metadata.success_count)
  ) / total;
  
  // Merge metadata
  base.metadata.success_count += other.metadata.success_count;
  base.metadata.failure_count += other.metadata.failure_count;
  base.metadata.merged_from = [base.id, other.id];
  
  return base;
}
```

---

## Performance Metrics

### Learning Metrics

**Tracked by telemetry.u:**

```javascript
// Pattern performance
{
  pattern_id: 'pattern_greeting_casual',
  metrics: {
    confidence: 0.85,
    success_rate: 0.92,              // successes / (successes + failures)
    usage_count: 234,
    avg_response_time_ms: 45,
    last_used: 1738777000000,
    age_days: 42
  }
}

// System-wide learning
{
  total_patterns: 45,
  trusted_patterns: 12,              // confidence > 0.85
  deprecated_patterns: 3,            // confidence < 0.20
  avg_confidence: 0.68,
  learning_rate: 0.15,               // deltas per hour
  consolidations: 5,                 // memory consolidations performed
  total_deltas: 1234
}
```

### User Experience Metrics

```javascript
{
  correct_responses: 234,            // No user correction
  incorrect_responses: 23,           // User corrected
  accuracy: 0.91,                    // 234 / (234 + 23)
  avg_correction_time_ms: 15000,     // Time user takes to correct
  memory_hits: 156,                  // Responses using memory
  memory_miss_rate: 0.12             // Failed memory retrievals
}
```

---

## Summary

**Message Architecture:**
- Zero-coupling via bus
- Schema-validated messages
- Observable message flow

**Learning Mechanism:**
- Pattern matching (regex + confidence)
- Delta learning (success +0.05, failure -0.10)
- Asymmetric rates (fast to doubt, slow to trust)
- Immutable learning log (append-only)

**Intelligence Sources:**
- Pattern confidence (learned from outcomes)
- Memory retrieval (past context informs present)
- User corrections (explicit feedback)
- Outcome evaluation (implicit feedback)

**Self-Training:**
- Starts at 0.50 confidence (neutral)
- Adjusts based on real-world performance
- Promotes high-confidence patterns (>0.85 = trusted)
- Deprecates low-confidence patterns (<0.20)
- Creates new patterns from user corrections

**No External LLMs:**
- All intelligence built from interaction
- Rule-based, transparent, explainable
- Deterministic (same input → same output, given same patterns)
- Privacy-preserving (no external API calls)

---

**End of MESSAGES.md**