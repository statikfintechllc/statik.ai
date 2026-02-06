export default class ECUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'ec.u';
    }
    async onInit() { console.log(`${this.id} initialized`); }
}
