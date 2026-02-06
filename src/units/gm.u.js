export default class GMUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'gm.u';
    }
    async onInit() { console.log(`${this.id} initialized`); }
}
