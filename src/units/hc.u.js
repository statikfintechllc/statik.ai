export default class HCUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'hc.u';
    }
    async onInit() { console.log(`${this.id} initialized`); }
}
