# Statik.ai – Unit APIs

> Auto-generated reference for cognitive unit public interfaces.

## Kernel

### `Kernel`
| Method | Description |
|--------|-------------|
| `init(capabilities)` | Initialise bus, registry, lifecycle, watchdog |
| `wake()` | Start all units in dependency order |
| `shutdown()` | Graceful shutdown |

## Bus

### `Bus`
| Method | Description |
|--------|-------------|
| `on(topic, callback)` | Subscribe to a topic; returns unsubscribe fn |
| `off(topic, callback)` | Unsubscribe |
| `emit(topic, payload)` | Publish a message |
| `request(topic, payload, timeout?)` | RPC-style request/response |

## Units

### `pce.u` – Perception & Context Encoder
| Method | Description |
|--------|-------------|
| `encode(text)` | Tokenise, classify intent, score novelty, emit ContextFrame |

### `as.u` – Attention & Salience
| Method | Description |
|--------|-------------|
| `evaluate(frame)` | Score a ContextFrame and forward if salient |

### `ti.u` – Temporal Integrator
| Method | Description |
|--------|-------------|
| `integrate(frame)` | Add sequence number, detect session boundary |

### `cm.u` – Core Memory
| Method | Description |
|--------|-------------|
| `store(context)` | Save an episodic memory |
| `query(keywords, limit?)` | Retrieve matching memories |
| `forget(id)` | Remove a memory |

### `nlp.u` – Natural Language Processor
| Method | Description |
|--------|-------------|
| `parse(text)` | Tokenise and extract entities |
| `compose(templateId, slots?)` | Generate response from template |

### `gm.u` – Goals & Motivation
| Method | Description |
|--------|-------------|
| `onContext(ctx)` | Generate a goal from context |
| `currentGoal()` | Return the top priority goal |

### `ee.u` – Evaluation & Error
| Method | Description |
|--------|-------------|
| `evaluate(action)` | Compare prediction vs outcome |

### `dbt.u` – Delta & Learning Ledger
| Method | Description |
|--------|-------------|
| `logDelta(type, before, after, evidence)` | Record a state change |
| `reinforce(patternId, delta)` | Adjust pattern confidence |

### `sa.u` – Self Model
| Method | Description |
|--------|-------------|
| `canDo(action)` | Check if system has a capability |
| `status()` | Return current system status |

### `ie.u` – Intent Execution
| Method | Description |
|--------|-------------|
| `execute(goal)` | Validate, predict, perform, report |

### `ec.u` – Constraints & Ethics
| Method | Description |
|--------|-------------|
| `validate(action)` | Check action against hard rules |

### `hc.u` – Homeostasis
| Method | Description |
|--------|-------------|
| `check()` | Periodic health check |

### `sync.u` – Sync & Federation
| Method | Description |
|--------|-------------|
| `broadcast(data)` | Send to other tabs via BroadcastChannel |
| `exportState()` | Export system state as JSON |
| `importState(json)` | Import state from JSON |

### `ui.u` – User Interface
| Method | Description |
|--------|-------------|
| `showMessage(text, sender?)` | Display a chat message |
| `updateStatus(status)` | Update status bar |

### `telemetry.u` – Observability
| Method | Description |
|--------|-------------|
| `record(name, value)` | Record a metric |
| `snapshot()` | Return all metrics |

### `dev.u` – Developer Tools
| Method | Description |
|--------|-------------|
| `simulate(topic, payload)` | Inject simulated event |
| `replay(count?)` | Replay recent messages |
