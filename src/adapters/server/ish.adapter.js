/**
 * iSH Environment Adapter
 * Helpers for running in iSH on iOS
 */

export const ISHAdapter = {
    isISH: () => {
        // Rough heuristic to detect iSH/Alpine Linux environment if running in node
        if (typeof process !== 'undefined' && process.platform === 'linux') {
            // Check for /proc/version or similar if precise detection needed
            return true;
        }
        return false;
    },

    getIP: () => {
        // Stub: get local IP in iSH
        return '127.0.0.1';
    }
};
