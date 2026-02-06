/**
 * chat.js – Chat interface
 *
 * Primary user interaction surface.
 * Renders message history and captures user input.
 */

export class Chat {
  constructor(bus) {
    this.bus = bus;
    this.messages = [];
  }

  /** Mount the chat UI */
  mount(container) {
    this.container = container;
    // TODO: render chat log + input field
    this.bus.on('ui.message', (msg) => this.addMessage(msg));
  }

  /** Add a message to the chat log */
  addMessage(msg) {
    this.messages.push(msg);
    // TODO: render message in DOM
  }

  /** Handle user input submission */
  onSubmit(text) {
    this.bus.emit('user.input', { text, timestamp: Date.now() });
    this.addMessage({ text, sender: 'user', timestamp: Date.now() });
  }

  destroy() {
    this.messages = [];
  }
}
