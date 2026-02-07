/**
 * Window Manager
 * Handles the lifecycle and interactions of floating windows
 */
export default class WindowManager {
    constructor(container) {
        this.container = container;
        this.windows = new Map(); // id -> domElement
        this.zIndex = 100;
        this.activeWindow = null;
    }

    /**
     * Create a new window or focus existing
     * @param {string} id Unique Window ID
     * @param {string} title Window Title
     * @param {object} options { width, height, x, y }
     */
    createWindow(id, title, options = {}) {
        if (this.windows.has(id)) {
            this.focusWindow(id);
            return this.windows.get(id);
        }

        const width = options.width || Math.min(600, window.innerWidth - 20);
        const height = options.height || Math.min(400, window.innerHeight - 100);
        const x = options.x || (window.innerWidth / 2) - (width / 2);
        const y = options.y || (window.innerHeight / 2) - (height / 2);

        const win = document.createElement('div');
        win.className = 'os-window';
        win.id = `win-${id}`;
        win.style.width = `${width}px`;
        win.style.height = `${height}px`;
        win.style.transform = `translate(${x}px, ${y}px)`;
        win.dataset.x = x;
        win.dataset.y = y;

        // Header
        const header = document.createElement('div');
        header.className = 'window-header';
        header.innerHTML = `
            <div class="window-title">${title}</div>
            <div class="window-controls">
                <div class="control-dot min"></div>
                <div class="control-dot max"></div>
                <div class="control-dot close"></div>
            </div>
        `;

        // Content
        const content = document.createElement('div');
        content.className = 'window-content';
        content.id = `content-${id}`;

        win.appendChild(header);
        win.appendChild(content);
        this.container.appendChild(win);

        this.windows.set(id, { element: win, content: content });
        this.setupDraggable(win, header);
        this.focusWindow(id);

        // Event Listeners for Controls
        header.querySelector('.close').onclick = (e) => {
            e.stopPropagation();
            this.closeWindow(id);
        };

        // Click to focus
        win.onmousedown = () => this.focusWindow(id);

        return { element: win, content: content };
    }

    closeWindow(id) {
        if (this.windows.has(id)) {
            const win = this.windows.get(id).element;
            win.style.opacity = '0';
            win.style.transform = `${win.style.transform} scale(0.9)`;
            setTimeout(() => {
                win.remove();
                this.windows.delete(id);
            }, 200);
        }
    }

    focusWindow(id) {
        if (!this.windows.has(id)) return;

        if (this.activeWindow && this.windows.has(this.activeWindow)) {
            this.windows.get(this.activeWindow).element.classList.remove('active');
        }

        const win = this.windows.get(id).element;
        this.zIndex++;
        win.style.zIndex = this.zIndex;
        win.classList.add('active');
        this.activeWindow = id;
    }

    setupDraggable(win, header) {
        let isDragging = false;
        let startX, startY;
        let initialX, initialY;

        header.onmousedown = (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = parseFloat(win.dataset.x);
            initialY = parseFloat(win.dataset.y);
            this.focusWindow(win.id.replace('win-', ''));
        };

        document.onmousemove = (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const newX = initialX + dx;
            const newY = initialY + dy;

            win.style.transform = `translate(${newX}px, ${newY}px)`;
            win.dataset.x = newX;
            win.dataset.y = newY;
        };

        document.onmouseup = () => {
            isDragging = false;
        };
    }
}
