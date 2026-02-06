/**
 * Phase 1: DETECT
 * Check environment capabilities
 */

export async function detectCapabilities() {
    console.log("Boot: Phase 1 - DETECT");

    const capabilities = {
        webgpu: !!navigator.gpu,
        opfs: !!(navigator.storage && navigator.storage.getDirectory),
        serviceWorker: 'serviceWorker' in navigator,
        notifications: 'Notification' in window,
        geolocation: 'geolocation' in navigator,
        storageEstimate: !!(navigator.storage && navigator.storage.estimate),
        indexedDB: !!window.indexedDB
    };

    console.log("Capabilities detected:", capabilities);
    return capabilities;
}
