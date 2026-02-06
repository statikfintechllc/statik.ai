export default class EEUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'ee.u';
    }
    async onInit() { console.log(`${this.id} initialized`); }
}
