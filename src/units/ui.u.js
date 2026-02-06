export default class UIUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'ui.u';
        this.dom = {};
    }

    async onInit() {
        console.log(`${this.id} initialized`);
        this.render();
        this.attachListeners();

        // Listen for system ready to unlock UI
        this.bus.subscribe('system.ready', (msg) => {
            this.addMessage('System', 'System is ready.');
            if (this.dom.input) this.dom.input.disabled = false;
            if (this.dom.status) {
                this.dom.status.textContent = 'SYSTEM READY';
                this.dom.status.style.color = '#58a6ff';
            }
        });

        // Listen for internal thoughts (tracing)
        this.bus.subscribe('*', (msg) => {
            if (msg.type.startsWith('context.') || msg.type === 'system.event') {
                console.log('UI Trace:', msg); // Keep console clean-ish, user sees meaningful stuff
            }
        });
    }

    render() {
        const root = document.getElementById('root');
        // Clear existing boot log if we want a fresh chat UI, or append below
        // For now, let's keep the header and replace main
        const main = document.querySelector('main');
        main.innerHTML = ''; // Clear boot log for chat view

        // Chat Container
        const container = document.createElement('div');
        container.className = 'chat-container';
        container.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            max-width: 800px;
            width: 100%;
            margin: 0 auto;
        `;

        // Messages Area
        const messages = document.createElement('div');
        messages.id = 'messages';
        messages.style.cssText = `
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        this.dom.messages = messages;

        // Input Area
        const inputArea = document.createElement('div');
        inputArea.style.cssText = `
            padding: 1rem;
            border-top: 1px solid var(--border-color);
            display: flex;
            gap: 10px;
        `;

        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'chat-input';
        input.placeholder = 'Enter command or message...';
        input.disabled = true; // Disabled until ready
        input.style.cssText = `
            flex: 1;
            padding: 10px;
            border-radius: 6px;
            border: 1px solid var(--border-color);
            background: rgba(110, 118, 129, 0.1);
            color: var(--text-color);
            outline: none;
        `;
        this.dom.input = input;

        const sendBtn = document.createElement('button');
        sendBtn.textContent = 'Send';
        sendBtn.style.cssText = `
            padding: 10px 20px;
            border-radius: 6px;
            border: none;
            background: var(--accent-color);
            color: white;
            cursor: pointer;
            font-weight: bold;
        `;
        this.dom.sendBtn = sendBtn;

        inputArea.appendChild(input);
        inputArea.appendChild(sendBtn);

        container.appendChild(messages);
        container.appendChild(inputArea);
        main.appendChild(container);

        this.dom.status = document.getElementById('status-indicator');
    }

    attachListeners() {
        const handleSend = () => {
            const text = this.dom.input.value.trim();
            if (text) {
                this.addMessage('User', text);
                this.injectInput(text);
                this.dom.input.value = '';
            }
        };

        this.dom.sendBtn.onclick = handleSend;
        this.dom.input.onkeydown = (e) => {
            if (e.key === 'Enter') handleSend();
        };
    }

    injectInput(text) {
        // Publish to bus for PCE to pick up
        this.bus.publish({
            id: `input_${Date.now()}`,
            type: 'ui.input',
            source: this.id,
            timestamp: Date.now(),
            content: text,
            payload: { raw: text } // payload for structured data
        });
    }

    addMessage(sender, text) {
        const msgEl = document.createElement('div');
        msgEl.style.cssText = `
            padding: 10px;
            border-radius: 8px;
            background: ${sender === 'User' ? 'var(--accent-color)' : '#161b22'};
            color: ${sender === 'User' ? '#fff' : 'var(--text-color)'};
            align-self: ${sender === 'User' ? 'flex-end' : 'flex-start'};
            max-width: 80%;
            border: 1px solid var(--border-color);
        `;
        msgEl.innerHTML = `<strong>${sender}:</strong> ${text}`;
        this.dom.messages.appendChild(msgEl);
        this.dom.messages.scrollTop = this.dom.messages.scrollHeight;
    }
}
