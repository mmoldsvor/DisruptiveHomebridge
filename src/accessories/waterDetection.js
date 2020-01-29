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
        let service = accessory.getService(Service.LeakSensor);

        service.getCharacteristic(Characteristic.LeakDetected)
            .on('get', this.getState.bind(this, accessory, service));
    }

    async getState (accessory, service, callback) {
        try {
            service.getCharacteristic(Characteristic.LeakDetected).updateValue(accessory.context.leakDetected);
        } catch (error) {
            this.log('Unable to retrieve LeakDetected');
        }
        callback();
    }
}

module.exports = temperatureAccessory;
