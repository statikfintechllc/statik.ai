export default class NLPUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'nlp.u';
    }
    async onInit() { console.log(`${this.id} initialized`); }
}
