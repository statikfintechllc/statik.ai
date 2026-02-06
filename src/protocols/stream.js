/**
 * stream.js – Streaming data protocol
 *
 * Enables continuous data flow between units
 * (e.g. perception frames, telemetry updates).
 */

export class Stream {
  constructor(bus) {
    this.bus = bus;
    this.streams = new Map(); // streamId → { topic, active }
  }

  /** Open a named stream */
  open(streamId, topic) {
    this.streams.set(streamId, { topic, active: true });
    this.bus.emit('stream.opened', { streamId, topic });
    return streamId;
  }

  /** Push data to a stream */
  push(streamId, data) {
    const stream = this.streams.get(streamId);
    if (!stream || !stream.active) return false;
    this.bus.emit(stream.topic, { streamId, data, timestamp: Date.now() });
    return true;
  }

  /** Close a stream */
  close(streamId) {
    const stream = this.streams.get(streamId);
    if (stream) {
      stream.active = false;
      this.bus.emit('stream.closed', { streamId });
    }
  }

  /** Subscribe to a stream */
  subscribe(topic, callback) {
    return this.bus.on(topic, callback);
  }
}
