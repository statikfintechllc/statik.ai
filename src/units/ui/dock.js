/**
 * System Dock
 * Launcher for system apps
 */
export default class Dock {
    constructor(container, ui) {
        this.container = container;
        this.ui = ui;
        this.items = [
            { id: 'terminal', icon: '💻', label: 'Terminal', action: () => ui.openTerminal() },
            { id: 'monitor', icon: '🧠', label: 'Brain Monitor', action: () => ui.openMonitor() },
            { id: 'fs', icon: '📁', label: 'Files', action: () => console.log('Open FS') },
            { id: 'settings', icon: '⚙️', label: 'Settings', action: () => console.log('Open Settings') }
        ];
        this.render();
    }

    render() {
        const dockEl = document.createElement('div');
        dockEl.id = 'dock';

        this.items.forEach(item => {
            const el = document.createElement('div');
            el.className = 'dock-item';
            el.innerHTML = item.icon; // Use emoji for now, replace with SVG later/assets
            el.title = item.label;
            el.onclick = () => {
                this.setActive(el);
                item.action();
            };
            dockEl.appendChild(el);
        });

        this.container.appendChild(dockEl);
    }

    setActive(el) {
        document.querySelectorAll('.dock-item').forEach(i => i.classList.remove('active'));
        el.classList.add('active');
    }
}
