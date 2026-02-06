# Statik.ai – Message Schemas

## Message Structure

All inter-unit messages follow this shape:

```json
{
  "id": "msg_xxxxx",
  "timestamp": 1738777200,
  "type": "request | response | event | stream",
  "source": "unit.name",
  "target": "unit.name | broadcast",
  "channel": "high | default | low",
  "payload": {
    "method": "...",
    "params": {},
    "data": {}
  },
  "metadata": {
    "timeout": 5000,
    "retries": 3,
    "trace": true
  }
}
```

## Channels

| Channel | Use Case |
|---------|----------|
| `high` | User-initiated actions, time-sensitive |
| `default` | Normal cognitive processing |
| `low` | Background tasks, housekeeping |

## Core Topics

| Topic | Emitter | Consumer | Description |
|-------|---------|----------|-------------|
| `context.frame` | pce.u | as.u | Raw perception frame |
| `context.salient` | as.u | ti.u | Filtered salient frame |
| `context.temporal` | ti.u | cm.u, gm.u | Temporally enriched frame |
| `goal.new` | gm.u | ie.u | New goal for execution |
| `goal.corrective` | ee.u | gm.u | Error-triggered correction |
| `action.completed` | ie.u | ee.u | Execution result |
| `outcome.success` | ee.u | dbt.u | Positive feedback |
| `outcome.failure` | ee.u | dbt.u | Negative feedback |
| `memory.stored` | cm.u | – | Confirmation of storage |
| `memory.prune` | hc.u | cm.u | Request to prune memories |
| `system.ready` | kernel | all | Boot complete |
| `system.pause` | controls | all | Pause processing |
| `system.resume` | controls | all | Resume processing |
| `unit.ready` | any unit | kernel | Unit initialised |
| `unit.heartbeat` | any unit | watchdog | Health ping |
| `ui.message` | ui.u | chat.js | Display a message |

## Schema Files

Located in `schemas/messages/`:
- `context.schema.json`
- `intent.schema.json`
- `memory.schema.json`
- `action.schema.json`
