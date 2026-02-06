/**
 * BOOT SEQUENCE
 */
import { detectCapabilities } from './detect.js';
import { hydrateState } from './hydrate.js';
import { Kernel } from '../src/kernel/kernel.u.js';

export async function boot() {
    console.group("System Boot");
    try {
        // 1. Detect
        const capabilities = await detectCapabilities();

        // 2. Initialize Kernel
        console.log("Boot: Phase 2 - INITIALIZE Kernel");
        const kernel = new Kernel();

        // 3. Hydrate
        await hydrateState();

        // 4. Wake (Kernel Init -> Unit loading)
        console.log("Boot: Phase 4 - WAKE");
        await kernel.init();

        console.log("Boot: Sequence Complete");
    } catch (err) {
        console.error("CRITICAL BOOT FAILURE", err);
    }
    console.groupEnd();
}

// Auto-start if imported as script
if (typeof window !== 'undefined') {
    window.Statik = { boot };
}
