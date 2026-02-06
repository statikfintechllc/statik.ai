export default class IEUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'ie.u';
    }
    async onInit() { console.log(`${this.id} initialized`); }
}
