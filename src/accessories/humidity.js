let Service, Characteristic;

//                                       Accessory Information                   Temperature Sensor                      Humidity Sensor
const allowedServices = new Set(['0000003E-0000-1000-8000-0026BB765291', '0000008A-0000-1000-8000-0026BB765291', '00000082-0000-1000-8000-0026BB765291']);

function updateBatteryStatus(accessory) {
    let temperatureService = accessory.getService(Service.TemperatureSensor);
    temperatureService.getCharacteristic(Characteristic.StatusLowBattery).updateValue(accessory.context.statusLowBattery);

    let humidityService = accessory.getService(Service.HumiditySensor);
    humidityService.getCharacteristic(Characteristic.StatusLowBattery).updateValue(accessory.context.statusLowBattery);
}

function updateStatus(accessory) {
    let temperatureService = accessory.getService(Service.TemperatureSensor);
    temperatureService.getCharacteristic(Characteristic.StatusActive).updateValue(accessory.context.active);
    temperatureService.getCharacteristic(Characteristic.StatusFault).updateValue(accessory.context.fault);

    let humidityService = accessory.getService(Service.HumiditySensor);
    humidityService.getCharacteristic(Characteristic.StatusActive).updateValue(accessory.context.active);
    humidityService.getCharacteristic(Characteristic.StatusFault).updateValue(accessory.context.fault);
}

function setContext(accessory, device) {
    accessory.context.currentTemperature = device.reported.humidity.temperature;
    accessory.context.currentRelativeHumidity = device.reported.humidity.relativeHumidity;
}

function handleEvent(accessory, event) {
    if (accessory.context.type === 'humidity' && event.eventType === 'humidity') {
        accessory.context.currentRelativeHumidity = event.data.humidity.relativeHumidity;
        accessory.context.currentTemperature = event.data.humidity.temperature;
        accessory.getService(Service.HumiditySensor).getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(accessory.context.currentRelativeHumidity);
        accessory.getService(Service.TemperatureSensor).getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.currentTemperature);
    }
}

function addAccessoryServices(device) {
    accessory.addService(Service.HumiditySensor, device.labels.name);
    accessory.addService(Service.TemperatureSensor, device.labels.name);
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
    allowedServices: allowedServices,
    accessory: humidityAccessory,
    updateBatteryStatus: updateBatteryStatus,
    updateStatus: updateStatus,
    setContext: setContext,
    handleEvent: handleEvent,
    addAccessoryServices: addAccessoryServices
};
