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
    this.container = null;
    this.logEl = null;
    this.inputEl = null;
  }

  /** Mount the chat UI */
  mount(container) {
    this.container = container;

    /* Render chat log + input field */
    container.innerHTML = `
      <div class="chat-log"></div>
      <div class="chat-input">
        <input type="text" placeholder="Type a message…" autocomplete="off" />
        <button>Send</button>
      </div>`;

    this.logEl = container.querySelector('.chat-log');
    this.inputEl = container.querySelector('.chat-input input');
    const sendBtn = container.querySelector('.chat-input button');

    /* Handle send */
    const submit = () => {
      const text = this.inputEl.value.trim();
      if (!text) return;
      this.inputEl.value = '';
      this.onSubmit(text);
    };

    sendBtn.addEventListener('click', submit);
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });

    /* Listen for system messages */
    this.bus.on('ui.message', (msg) => this.addMessage(msg));
  }

  /** Add a message to the chat log */
  addMessage(msg) {
    this.messages.push(msg);

    if (this.logEl) {
      const div = document.createElement('div');
      div.className = `chat-message chat-message--${msg.sender === 'user' ? 'user' : 'system'}`;
      div.textContent = msg.text;
      this.logEl.appendChild(div);
      this.logEl.scrollTop = this.logEl.scrollHeight;
    }
  }

  /** Handle user input submission */
  onSubmit(text) {
    this.bus.emit('user.input', { text, timestamp: Date.now() });
    this.addMessage({ text, sender: 'user', timestamp: Date.now() });
  }

  destroy() {
    this.messages = [];
    if (this.container) this.container.innerHTML = '';
  }
}
