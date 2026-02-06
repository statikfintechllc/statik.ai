/**
 * detect.js – Capability detection for the host environment
 *
 * Probes browser/device APIs and records what is available:
 *   - OPFS, WebGPU, SharedArrayBuffer, Service Worker
 *   - Storage quota, device memory, hardware concurrency
 *   - iOS-specific features (haptics, sensors)
 *
 * Results are stored in configs/capabilities.json at runtime.
 */

export async function detect() {
  const capabilities = {
    timestamp: Date.now(),
    platform: detectPlatform(),
    apis: {
      serviceWorker: 'serviceWorker' in navigator,
      opfs: typeof navigator.storage?.getDirectory === 'function',
      webgpu: typeof navigator.gpu !== 'undefined',
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      indexedDB: typeof indexedDB !== 'undefined',
      notifications: 'Notification' in (typeof window !== 'undefined' ? window : {}),
      geolocation: 'geolocation' in navigator,
      camera: typeof navigator.mediaDevices?.getUserMedia === 'function',
      vibration: 'vibrate' in navigator,
      webCrypto: typeof crypto?.subtle !== 'undefined',
      broadcastChannel: typeof BroadcastChannel !== 'undefined',
      webRTC: typeof RTCPeerConnection !== 'undefined',
    },
    hardware: {
      cores: navigator.hardwareConcurrency || 1,
      deviceMemory: navigator.deviceMemory || null,
    },
    storage: await estimateStorage(),
  };

  return capabilities;
}

function detectPlatform() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

async function estimateStorage() {
  if (!navigator.storage?.estimate) return { quota: null, usage: null };
  try {
    const { quota, usage } = await navigator.storage.estimate();
    return { quota, usage };
  } catch {
    return { quota: null, usage: null };
  }
}
