/**
 * event.js – Fire-and-forget event protocol
 *
 * Simple one-way events that don't expect a response.
 * Used for notifications, state changes, and logging.
 */

export class EventProtocol {
  constructor(bus) {
    this.bus = bus;
  }

  /** Emit a fire-and-forget event */
  fire(topic, data) {
    this.bus.emit(topic, {
      ...data,
      _type: 'event',
      _timestamp: Date.now(),
    });
  }

  /** Listen for events on a topic */
  listen(topic, callback) {
    return this.bus.on(topic, callback);
  }
}
