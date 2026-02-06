/**
 * hardware.adapter.js – iOS hardware integration
 *
 * Wraps camera, sensors (accelerometer, gyroscope, ambient light),
 * geolocation, and haptic feedback for pce.u context input.
 */

export class HardwareAdapter {
  constructor() {
    this.available = {
      camera: typeof navigator.mediaDevices?.getUserMedia === 'function',
      motion: typeof DeviceMotionEvent !== 'undefined',
      geolocation: 'geolocation' in navigator,
      vibration: 'vibrate' in navigator,
    };
  }

  /** Request camera stream */
  async getCamera(facingMode = 'environment') {
    if (!this.available.camera) return null;
    return navigator.mediaDevices.getUserMedia({ video: { facingMode } });
  }

  /** Read device motion (single sample) */
  readMotion() {
    return new Promise((resolve) => {
      if (!this.available.motion) return resolve(null);
      const handler = (e) => {
        window.removeEventListener('devicemotion', handler);
        resolve({
          acceleration: e.acceleration,
          rotationRate: e.rotationRate,
          interval: e.interval,
        });
      };
      window.addEventListener('devicemotion', handler, { once: true });
      // Timeout after 2s if no motion event fires
      setTimeout(() => resolve(null), 2000);
    });
  }

  /** Get current geolocation */
  getLocation() {
    if (!this.available.geolocation) return Promise.resolve(null);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve(null)
      );
    });
  }

  /** Trigger haptic feedback */
  vibrate(pattern = [50]) {
    if (this.available.vibration) navigator.vibrate(pattern);
  }
}
