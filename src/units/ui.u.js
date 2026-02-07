import WindowManager from './ui/wm.js';
import Dock from './ui/dock.js';
import TerminalWidget from './ui/widgets/terminal.js';
import MonitorWidget from './ui/widgets/monitor.js';

/**
 * UI Unit (Spatial OS Controller)
 * Orchestrates the Desktop Environment
 */
export default class UIUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'ui.u';
    }

    async onInit() {
        console.log(`${this.id} initialized (Spatial Mode)`);

        // Setup Desktop Environment
        this.root = document.getElementById('root');
        this.root.innerHTML = ''; // Clear boot text

        // 1. Desktop Layer
        this.desktop = document.createElement('div');
        this.desktop.id = 'desktop';
        this.root.appendChild(this.desktop);

        // 2. Window Manager
        this.wm = new WindowManager(this.desktop);

        // 3. Dock
        this.dock = new Dock(this.root, this);

        // 4. Open Default Apps
        this.openTerminal();

        // 5. System Event Listeners
        this.attachListeners();
    }

    openTerminal() {
        const win = this.wm.createWindow('terminal', 'Neural Terminal', {
            width: 700,
            height: 500
        });

        // Only init widget if new window content
        if (!win.content.hasChildNodes()) {
            this.terminal = new TerminalWidget(win.content, this.bus);
        }
    }

    openMonitor() {
        const win = this.wm.createWindow('monitor', 'Cognitive Stream', {
            width: 600,
            height: 450,
            x: 40,
            y: 40
        });
        if (!win.content.hasChildNodes()) {
            this.monitor = new MonitorWidget(win.content, this.bus);
        }
    }

    attachListeners() {
        // Subscribe to system outputs
        this.bus.subscribe('ui.output', (msg) => {
            if (this.terminal) {
                this.terminal.print(msg.content, 'statik');
            }
        });

        // Debug Logs (optional)
        this.bus.subscribe('*', (msg) => {
            // We can pipe debug logs to a console widget later
        });
    }
}
