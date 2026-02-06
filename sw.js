/**
 * CSA.OS - Service Worker
 * Background processing, caching, and offline support
 * Handles background sync and push notifications
 */

const CACHE_VERSION = 'csa-os-v1';
const CACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/core/system.js',
    '/core/storage.js',
    '/core/agent.js',
    '/core/hardware.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => {
                console.log('[ServiceWorker] Caching app assets');
                return cache.addAll(CACHE_ASSETS);
            })
            .then(() => {
                console.log('[ServiceWorker] Installed');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_VERSION)
                        .map((name) => {
                            console.log('[ServiceWorker] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[ServiceWorker] Activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }

                return fetch(event.request)
                    .then((response) => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        caches.open(CACHE_VERSION)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // Return a custom offline page if available
                        return caches.match('/offline.html');
                    });
            })
    );
});

// Background Sync event
self.addEventListener('sync', (event) => {
    console.log('[ServiceWorker] Background sync:', event.tag);
    
    if (event.tag === 'agent-sync') {
        event.waitUntil(syncAgents());
    }
});

// Periodic Background Sync (if supported)
self.addEventListener('periodicsync', (event) => {
    console.log('[ServiceWorker] Periodic sync:', event.tag);
    
    if (event.tag === 'agent-update') {
        event.waitUntil(updateAgents());
    }
});

// Push notification event
self.addEventListener('push', (event) => {
    console.log('[ServiceWorker] Push received');
    
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'CSA.OS Notification';
    const options = {
        body: data.body || 'Agent activity notification',
        icon: '/icon-192.png',
        badge: '/badge.png',
        vibrate: [200, 100, 200],
        data: data
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('[ServiceWorker] Notification clicked');
    
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('/')
    );
});

// Message event - communication with main thread
self.addEventListener('message', (event) => {
    console.log('[ServiceWorker] Message received:', event.data);
    
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data.type === 'CACHE_URLS') {
        caches.open(CACHE_VERSION)
            .then((cache) => {
                return cache.addAll(event.data.urls);
            });
    }
    
    if (event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_VERSION)
            .then(() => {
                event.ports[0].postMessage({ success: true });
            });
    }
});

// Helper functions
async function syncAgents() {
    console.log('[ServiceWorker] Syncing agents...');
    // Placeholder for agent synchronization logic
    // Will be implemented with actual agent communication
    return Promise.resolve();
}

async function updateAgents() {
    console.log('[ServiceWorker] Updating agents...');
    // Placeholder for periodic agent updates
    // Will be implemented with actual agent update logic
    return Promise.resolve();
}

// Background task processing
async function processBackgroundTask(task) {
    console.log('[ServiceWorker] Processing background task:', task);
    
    try {
        // Open IndexedDB
        const db = await openDatabase();
        
        // Process task based on type
        switch (task.type) {
            case 'agent-execution':
                return await executeAgentTask(db, task);
            case 'data-sync':
                return await syncData(db, task);
            case 'cleanup':
                return await cleanup(db, task);
            default:
                console.warn('[ServiceWorker] Unknown task type:', task.type);
        }
    } catch (error) {
        console.error('[ServiceWorker] Task processing failed:', error);
        throw error;
    }
}

function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('CSA_OS_DB', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function executeAgentTask(db, task) {
    console.log('[ServiceWorker] Executing agent task:', task.id);
    // Placeholder for agent task execution in background
    return { success: true, taskId: task.id };
}

async function syncData(db, task) {
    console.log('[ServiceWorker] Syncing data');
    // Placeholder for data synchronization
    return { success: true };
}

async function cleanup(db, task) {
    console.log('[ServiceWorker] Running cleanup');
    // Placeholder for cleanup operations
    return { success: true };
}
