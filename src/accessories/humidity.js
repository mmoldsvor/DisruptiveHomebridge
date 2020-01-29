let Service, Characteristic;


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
        temperatureService.getCharacteristic(Characteristic.CurrentTemperature)
            .on('get', this.getTemperature.bind(this, accessory, temperatureService));

        let humidityService = accessory.getService(Service.HumiditySensor);
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

module.exports = humidityAccessory;
