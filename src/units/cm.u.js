export default class CMUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'cm.u';
    }
    async onInit() { console.log(`${this.id} initialized`); }
}
