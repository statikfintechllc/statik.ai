/**
 * permissions.adapter.js – Permission request management for iOS
 *
 * Wraps the Permissions API to query and request access to
 * camera, notifications, geolocation, etc.
 */

export class PermissionsAdapter {
  /** Query current permission state */
  async query(name) {
    if (!navigator.permissions?.query) return 'unknown';
    try {
      const status = await navigator.permissions.query({ name });
      return status.state; // 'granted' | 'denied' | 'prompt'
    } catch {
      return 'unknown';
    }
  }

  /** Request notification permission */
  async requestNotifications() {
    if (!('Notification' in (typeof window !== 'undefined' ? window : {}))) return 'denied';
    return Notification.requestPermission();
  }

  /** Request camera permission (triggers browser prompt) */
  async requestCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      return 'granted';
    } catch {
      return 'denied';
    }
  }
}
