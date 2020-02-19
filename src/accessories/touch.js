let Service, Characteristic;

//                                       Accessory Information                   Stateless Programmable Switch
const allowedServices = new Set(['0000003E-0000-1000-8000-0026BB765291', '00000089-0000-1000-8000-0026BB765291']);

function handleEvent(accessory, event) {
    if (accessory.context.type === 'touch' && event.eventType === 'touch') {
        accessory.getService(Service.StatelessProgrammableSwitch).getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(0);
    }
}

function addAccessoryServices(device) {
    accessory.addService(Service.StatelessProgrammableSwitch, device.labels.name);
}

class touchAccessory {
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
        let service = accessory.getService(Service.StatelessProgrammableSwitch);

        service.getCharacteristic(Characteristic.ProgrammableSwitchEvent)
            .on('set', function(callback) {
                callback();
            });
    }
}

module.exports = {
    allowedServices: allowedServices,
    accessory: touchAccessory,
    handleEvent: handleEvent,
    addAccessoryServices: addAccessoryServices
};
