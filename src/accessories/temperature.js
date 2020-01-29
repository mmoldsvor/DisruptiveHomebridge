let Service, Characteristic;


class temperatureAccessory {
    constructor (platform, accessory) {
        Service = platform.api.hap.Service;
        Characteristic = platform.api.hap.Characteristic;

        this.platform = platform;
        this.log = platform.log;
        this.api = platform.api;
        this.config = platform.config;
        this.accessories = platform.accessories;

        this.getService(accessory);
    }

    getService (accessory) {
        let service = accessory.getService(Service.TemperatureSensor);

        service.getCharacteristic(Characteristic.CurrentTemperature)
            .on('get', this.getState.bind(this, accessory, service));
    }

    async getState (accessory, service, callback) {
        service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.currentTemperature);
        callback();
    }
}

module.exports = temperatureAccessory;
