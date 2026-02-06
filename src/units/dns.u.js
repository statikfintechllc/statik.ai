export default class DNSUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'dns.u';
    }
    async onInit() { console.log(`${this.id} initialized`); }
}
