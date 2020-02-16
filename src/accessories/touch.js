let Service, Characteristic;


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

module.exports = touchAccessory;
