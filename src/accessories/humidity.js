let Service, Characteristic;

function updateBatteryStatus(accessory) {
    let temperatureService = accessory.getService(Service.TemperatureSensor);
    temperatureService.getCharacteristic(Characteristic.StatusLowBattery).updateValue(accessory.context.batteryStatus);

    let humidityService = accessory.getService(Service.HumiditySensor);
    humidityService.getCharacteristic(Characteristic.StatusLowBattery).updateValue(accessory.context.batteryStatus);
}

function updateStatus(accessory) {
    let temperatureService = accessory.getService(Service.TemperatureSensor);
    temperatureService.getCharacteristic(Characteristic.StatusActive).updateValue(accessory.context.active);
    temperatureService.getCharacteristic(Characteristic.StatusFault).updateValue(accessory.context.fault);

    let humidityService = accessory.getService(Service.HumiditySensor);
    humidityService.getCharacteristic(Characteristic.StatusActive).updateValue(accessory.context.active);
    humidityService.getCharacteristic(Characteristic.StatusFault).updateValue(accessory.context.fault);
}

class humidityAccessory {
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
        let temperatureService = accessory.getService(Service.TemperatureSensor);

        // Add Optional Characteristics
        if (!temperatureService.testCharacteristic(Characteristic.StatusActive))
            temperatureService.addCharacteristic(Characteristic.StatusActive);

        if (!temperatureService.testCharacteristic(Characteristic.StatusFault))
            temperatureService.addCharacteristic(Characteristic.StatusFault);

        if (!temperatureService.testCharacteristic(Characteristic.StatusLowBattery))
            temperatureService.addCharacteristic(Characteristic.StatusLowBattery);

        temperatureService.getCharacteristic(Characteristic.CurrentTemperature)
            .on('get', this.getTemperature.bind(this, accessory, temperatureService))
            .setProps({
                minValue: -100,
                maxValue: 100,
                minStep: 0.01,
                unit: Characteristic.Units.CELSIUS
            });

        let humidityService = accessory.getService(Service.HumiditySensor);

        // Add Optional Characteristics
        if (!humidityService.testCharacteristic(Characteristic.StatusActive))
            humidityService.addCharacteristic(Characteristic.StatusActive);

        if (!humidityService.testCharacteristic(Characteristic.StatusFault))
            humidityService.addCharacteristic(Characteristic.StatusFault);

        if (!humidityService.testCharacteristic(Characteristic.StatusLowBattery))
            humidityService.addCharacteristic(Characteristic.StatusLowBattery);

        humidityService.getCharacteristic(Characteristic.CurrentRelativeHumidity)
            .on('get', this.getHumidity.bind(this, accessory, humidityService));
    }

    async getTemperature (accessory, service, callback) {
        try {
            service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.currentTemperature);
        } catch (error) {
            this.log('Unable to retrieve CurrentTemperature');
        }
        callback();
    }

    async getHumidity (accessory, service, callback) {
        try {
            service.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(accessory.context.currentRelativeHumidity);
        } catch (error) {
            this.log('Unable to retrieve CurrentRelativeHumidity');
        }
        callback();
    }
}

module.exports = {
    accessory: humidityAccessory,
    updateBatteryStatus: updateBatteryStatus,
    updateStatus: updateStatus
};
