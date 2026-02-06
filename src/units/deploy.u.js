export default class DeployUnit {
    constructor(bus) {
        this.bus = bus;
        this.id = 'deploy.u';
    }
    async onInit() { console.log(`${this.id} initialized`); }
}
