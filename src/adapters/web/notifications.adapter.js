/**
 * notifications.adapter.js – Web Notifications adapter
 *
 * Sends local notifications for alerts, goal completions,
 * and critical system events.
 */

export class NotificationsAdapter {
  constructor() {
    this.available = 'Notification' in (typeof window !== 'undefined' ? window : {});
    this.permission = this.available ? Notification.permission : 'denied';
  }

  /** Request permission if not already granted */
  async requestPermission() {
    if (!this.available) return 'denied';
    this.permission = await Notification.requestPermission();
    return this.permission;
  }

  /** Show a notification */
  show(title, options = {}) {
    if (this.permission !== 'granted') return null;
    return new Notification(title, {
      icon: 'assets/icons/icon-72.png',
      badge: 'assets/icons/icon-72.png',
      ...options,
    });
  }
}
