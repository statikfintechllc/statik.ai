/**
 * pause.js – System pause control
 *
 * Pauses all cognitive processing while keeping the UI responsive.
 */

export class PauseControl {
  constructor(bus) {
    this.bus = bus;
    this.paused = false;
  }

  toggle() {
    this.paused = !this.paused;
    this.bus.emit(this.paused ? 'system.pause' : 'system.resume', {
      timestamp: Date.now(),
    });
  }

  isPaused() {
    return this.paused;
  }
}
