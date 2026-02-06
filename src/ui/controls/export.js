/**
 * export.js – State export control
 *
 * Exports the system state as a downloadable sfti.iso JSON file.
 */

export class ExportControl {
  constructor(bus) {
    this.bus = bus;
  }

  /** Trigger a state export and download */
  async exportAndDownload(snapshotManager) {
    const snapshot = await snapshotManager.create();
    const json = JSON.stringify(snapshot, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `statik-${new Date().toISOString().slice(0, 10)}.sfti.json`;
    a.click();

    URL.revokeObjectURL(url);
    this.bus.emit('state.exported', { timestamp: Date.now() });
  }
}
