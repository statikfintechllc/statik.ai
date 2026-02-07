import VFS from '../vfs/vfs.js';

export default class DeveloperUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'dev.u';
        this.vfs = new VFS(bus);
        this.syncing = false;
    }

    async onInit() {
        console.log(`${this.id} initialized`);
        await this.vfs.init();

        // Start sync process shortly after init
        setTimeout(() => this.syncSourceTree(), 1000);

        // Listen for debug commands
        this.bus.subscribe('dev.*', (msg) => {
            if (msg.type === 'dev.command.sync') {
                this.syncSourceTree();
            }
        });
    }

    async syncSourceTree() {
        if (this.syncing) return;
        this.syncing = true;

        console.log("DEV: Starting source tree sync...");
        this.bus.emit('dev.sync.start', {});

        try {
            // 1. Get Manifest from Server
            const response = await fetch('/manifest');
            if (!response.ok) throw new Error("Failed to fetch manifest");
            const manifest = await response.json();

            console.log(`DEV: Manifest received. ${manifest.length} files.`);

            let downloaded = 0;
            let skipped = 0;
            let errors = 0;

            // 2. Diff and Download
            for (const item of manifest) {
                // Check if file exists in OPFS
                const exists = await this.vfs.exists(item.path);

                // For this phase, we will do a simple "if not exists" check
                // In future: Check mtime or hash
                if (!exists) {
                    await this.downloadFile(item.path);
                    downloaded++;
                } else {
                    skipped++;
                }

                // Report progress periodically
                if ((downloaded + skipped) % 10 === 0) {
                    this.bus.emit('dev.sync.progress', {
                        total: manifest.length,
                        current: downloaded + skipped
                    });
                }
            }

            console.log(`DEV: Sync Complete. +${downloaded}, =${skipped}, !${errors}`);
            this.bus.emit('dev.sync.complete', { downloaded, skipped, errors });

        } catch (e) {
            console.error("DEV: Sync Failed", e);
            this.bus.emit('dev.sync.error', { error: e.message });
        } finally {
            this.syncing = false;
        }
    }

    async downloadFile(path) {
        try {
            const res = await fetch(path);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const blob = await res.blob();

            // Write to OPFS
            await this.vfs.write(path, blob);
            // console.log(`DEV: Downloaded ${path}`);
        } catch (e) {
            console.error(`DEV: Failed to download ${path}`, e);
            throw e;
        }
    }
}
