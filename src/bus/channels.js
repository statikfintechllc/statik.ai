/**
 * channels.js – Priority lanes for the message bus
 *
 * Messages can be routed through different priority channels:
 *   - high:    user-initiated, time-sensitive
 *   - default: normal processing
 *   - low:     background, housekeeping
 */

export const CHANNELS = {
  HIGH: 'high',
  DEFAULT: 'default',
  LOW: 'low',
};

export class ChannelRouter {
  constructor(bus) {
    this.bus = bus;
    this.queues = {
      [CHANNELS.HIGH]: [],
      [CHANNELS.DEFAULT]: [],
      [CHANNELS.LOW]: [],
    };
  }

  /** Enqueue a message on the appropriate channel */
  enqueue(channel, topic, payload) {
    const ch = this.queues[channel] || this.queues[CHANNELS.DEFAULT];
    ch.push({ topic, payload, enqueuedAt: Date.now() });
  }

  /** Flush queues in priority order */
  flush() {
    for (const ch of [CHANNELS.HIGH, CHANNELS.DEFAULT, CHANNELS.LOW]) {
      while (this.queues[ch].length > 0) {
        const msg = this.queues[ch].shift();
        this.bus.emit(msg.topic, msg.payload);
      }
    }
  }
}
