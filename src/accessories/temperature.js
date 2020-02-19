let Service, Characteristic;

//                                       Accessory Information                   TemperatureSensor
const allowedServices = new Set(['0000003E-0000-1000-8000-0026BB765291', '0000008A-0000-1000-8000-0026BB765291']);

function updateBatteryStatus(accessory) {
    let service = accessory.getService(Service.TemperatureSensor);
    service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(accessory.context.statusLowBattery);
}

function updateStatus(accessory) {
    let service = accessory.getService(Service.TemperatureSensor);
    service.getCharacteristic(Characteristic.StatusActive).updateValue(accessory.context.active);
    service.getCharacteristic(Characteristic.StatusFault).updateValue(accessory.context.fault);
}

function setContext(accessory, device) {
    accessory.context.currentTemperature = device.reported.temperature.value;
}

function handleEvent(accessory, event) {
    if (accessory.context.type === 'temperature' && event.eventType === 'temperature') {
        accessory.context.currentTemperature = event.data.temperature.value;
        accessory.getService(Service.TemperatureSensor).getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.currentTemperature);
    }
}

function addAccessoryServices(device) {
    accessory.addService(Service.TemperatureSensor, device.labels.name);
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
    allowedServices: allowedServices,
    accessory: temperatureAccessory,
    updateBatteryStatus: updateBatteryStatus,
    updateStatus: updateStatus,
    setContext: setContext,
    handleEvent: handleEvent,
    addAccessoryServices: addAccessoryServices
};
