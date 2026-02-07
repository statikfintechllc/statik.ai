/**
 * Terminal Widget
 * The main chat interface
 */
export default class TerminalWidget {
    constructor(container, bus) {
        this.container = container;
        this.bus = bus;
        this.render();
    }

    render() {
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.background = 'rgba(0,0,0,0.2)';
        this.container.style.height = '100%';

        // Log Area
        this.log = document.createElement('div');
        this.log.style.cssText = `
            flex: 1;
            padding: 12px;
            overflow-y: auto;
            color: var(--text-secondary);
            font-family: var(--font-code);
            font-size: 13px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;

        // Input Area
        this.inputBar = document.createElement('div');
        this.inputBar.style.cssText = `
            padding: 10px;
            display: flex;
            background: rgba(255,255,255,0.02);
            border-top: 1px solid var(--glass-border);
        `;

        this.prompt = document.createElement('span');
        this.prompt.textContent = 'statik@core ~ $ ';
        this.prompt.style.cssText = `
            color: var(--neon-cyan);
            font-family: var(--font-code);
            font-size: 13px;
            margin-right: 8px;
            padding-top: 2px;
        `;

        this.input = document.createElement('input');
        this.input.type = 'text';
        this.input.style.cssText = `
            flex: 1;
            background: transparent;
            border: none;
            color: var(--text-primary);
            font-family: var(--font-code);
            font-size: 13px;
            outline: none;
        `;

        this.inputBar.appendChild(this.prompt);
        this.inputBar.appendChild(this.input);

        this.container.appendChild(this.log);
        this.container.appendChild(this.inputBar);

        // Attach listeners
        this.input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                const text = this.input.value.trim();
                if (text) {
                    this.print(`> ${text}`, 'user');
                    this.bus.publish({
                        id: `input_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        type: 'ui.input',
                        source: 'terminal',
                        content: text,
                        timestamp: Date.now()
                    });
                    this.input.value = '';
                }
            }
        };

        // Welcome Message
        this.print('Statik Core Online. Systems Nominal.', 'system');
    }

    print(text, type = 'info') {
        const line = document.createElement('div');
        line.textContent = text;

        if (type === 'user') {
            line.style.color = 'var(--text-primary)';
        } else if (type === 'system') {
            line.style.color = 'var(--neon-purple)';
        } else if (type === 'statik') {
            line.style.color = 'var(--neon-cyan)';
        }

        this.log.appendChild(line);
        this.log.scrollTop = this.log.scrollHeight;
    }
}
