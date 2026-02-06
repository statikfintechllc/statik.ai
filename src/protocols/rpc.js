/**
 * rpc.js – Request/response protocol
 *
 * Wraps the bus request/reply pattern for inter-unit RPC calls.
 */

export class RPC {
  constructor(bus) {
    this.bus = bus;
    this.handlers = new Map(); // method → handler fn
  }

  /** Register an RPC handler */
  handle(method, handler) {
    this.handlers.set(method, handler);
    this.bus.on(`rpc.${method}`, async (msg) => {
      try {
        const result = await handler(msg.params);
        this.bus.emit(msg._replyTo, { result, error: null });
      } catch (err) {
        this.bus.emit(msg._replyTo, { result: null, error: err.message });
      }
    });
  }

  /** Call a remote method and await the result */
  async call(method, params, timeoutMs = 5000) {
    const response = await this.bus.request(`rpc.${method}`, { params }, timeoutMs);
    if (response.error) throw new Error(response.error);
    return response.result;
  }
}
