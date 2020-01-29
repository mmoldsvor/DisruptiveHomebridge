let Service, Characteristic;


class proximityAccessory {
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
        let service = accessory.getService(Service.ContactSensor);

        service.getCharacteristic(Characteristic.ContactSensorState)
            .on('get', this.getState.bind(this, accessory, service));

    }

    async getState (accessory, service, callback) {
        try {
            service.getCharacteristic(Characteristic.ContactSensorState).updateValue(accessory.context.objectPresent);
        } catch (error) {
            this.log('Unable to retrieve ObjectPresent');
        }
        callback();
    }
}

module.exports = proximityAccessory;
