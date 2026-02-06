export default class DBTUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'dbt.u';
    }
    async onInit() { console.log(`${this.id} initialized`); }
}
