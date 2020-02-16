let Service, Characteristic;

function updateBatteryStatus(accessory) {
    let service = accessory.getService(Service.TemperatureSensor);
    service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(accessory.context.batteryStatus);
}

function updateStatus(accessory) {
    let service = accessory.getService(Service.TemperatureSensor);
    service.getCharacteristic(Characteristic.StatusActive).updateValue(accessory.context.active);
    service.getCharacteristic(Characteristic.StatusFault).updateValue(accessory.context.fault);
}

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

        // Add Optional Characteristics
        if (!service.testCharacteristic(Characteristic.StatusActive))
            service.addCharacteristic(Characteristic.StatusActive);

        if (!service.testCharacteristic(Characteristic.StatusFault))
            service.addCharacteristic(Characteristic.StatusFault);

        if (!service.testCharacteristic(Characteristic.StatusLowBattery))
            service.addCharacteristic(Characteristic.StatusLowBattery);

        service.getCharacteristic(Characteristic.CurrentTemperature)
            .on('get', this.getState.bind(this, accessory, service))
            .setProps({
                minValue: -100,
                maxValue: 100,
                minStep: 0.01,
                unit: Characteristic.Units.CELSIUS
            });
    }

    async getState (accessory, service, callback) {
        service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.currentTemperature);
        callback();
    }
}

module.exports = {
    accessory: temperatureAccessory,
    updateBatteryStatus: updateBatteryStatus,
    updateStatus: updateStatus
};
