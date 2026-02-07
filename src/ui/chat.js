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
    this._unsubs = [];
    this._domCleanups = [];
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

    const clickHandler = () => submit();
    const keyHandler = (e) => { if (e.key === 'Enter') submit(); };
    sendBtn.addEventListener('click', clickHandler);
    this.inputEl.addEventListener('keydown', keyHandler);
    this._domCleanups.push(
      () => sendBtn.removeEventListener('click', clickHandler),
      () => this.inputEl.removeEventListener('keydown', keyHandler)
    );

    /* Listen for system messages */
    this._unsubs.push(this.bus.on('ui.message', (msg) => this.addMessage(msg)));
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
    this._unsubs.forEach((fn) => fn());
    this._unsubs = [];
    this._domCleanups.forEach((fn) => fn());
    this._domCleanups = [];
    this.messages = [];
    if (this.container) this.container.innerHTML = '';
  }
}
