export default class SAUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'sa.u';
    }
    async onInit() { console.log(`${this.id} initialized`); }
}
