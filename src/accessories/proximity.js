let Service, Characteristic;

//                                       Accessory Information                   Contact Sensor
const allowedServices = new Set(['0000003E-0000-1000-8000-0026BB765291', '00000080-0000-1000-8000-0026BB765291']);

function updateBatteryStatus(accessory) {
    let service = accessory.getService(Service.ContactSensor);
    service.getCharacteristic(Characteristic.StatusLowBattery).updateValue(accessory.context.statusLowBattery);
}

function updateStatus(accessory) {
    let service = accessory.getService(Service.ContactSensor);
    service.getCharacteristic(Characteristic.StatusActive).updateValue(accessory.context.active);
    service.getCharacteristic(Characteristic.StatusFault).updateValue(accessory.context.fault);
}

function setContext(accessory, device) {
    accessory.context.objectPresent = (device.reported.objectPresent.state === 'NOT_PRESENT');
}

function handleEvent(accessory, event) {
    if (accessory.context.type === 'proximity' && event.eventType === 'objectPresent') {
        accessory.context.objectPresent = (event.data.objectPresent.state === 'NOT_PRESENT');
        accessory.getService(Service.ContactSensor).getCharacteristic(Characteristic.ContactSensorState).updateValue(accessory.context.objectPresent);
    }
}

function addAccessoryServices(device) {
    accessory.addService(Service.ContactSensor, device.labels.name);
}

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

        // Add Optional Characteristics
        if (!service.testCharacteristic(Characteristic.StatusActive))
            service.addCharacteristic(Characteristic.StatusActive);

        if (!service.testCharacteristic(Characteristic.StatusFault))
            service.addCharacteristic(Characteristic.StatusFault);

        if (!service.testCharacteristic(Characteristic.StatusLowBattery))
            service.addCharacteristic(Characteristic.StatusLowBattery);

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

module.exports = {
    allowedServices: allowedServices,
    accessory: proximityAccessory,
    updateBatteryStatus: updateBatteryStatus,
    updateStatus: updateStatus,
    setContext: setContext,
    handleEvent: handleEvent,
    addAccessoryServices: addAccessoryServices
};
