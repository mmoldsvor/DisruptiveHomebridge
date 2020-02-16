let Accessory, Service, Characteristic, UUIDGen;

const request = require('request-promise');
const express = require('express');
const jwt = require('jsonwebtoken');

const touchAccessory = require('./accessories/touch.js');
const temperatureAccessory = require('./accessories/temperature.js');
const humidityAccessory = require('./accessories/humidity.js');
const proximityAccessory = require('./accessories/proximity.js');

const pluginName = 'homebridge-testing';
const platformName = 'DisruptivePlatform';

app = express();
app.use(express.json());

module.exports = function (homebridge) {
    Accessory = homebridge.platformAccessory;
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    UUIDGen = homebridge.hap.uuid;

    return DisruptivePlatform;
};

function DisruptivePlatform (log, config, api) {
    this.validResponse = false;

    this.log = log;
    this.config = config;
    this.url = 'http://api.disruptive-technologies.com/v2/';
    this.accessories = [];
    this.accessoryMap = new Map();

    this.token = '';
    this.tokenExpiration = 0;

    if (!this.checkRequiredConfig()) {
        return;
    }

    this.projectId = this.config.projectId;
    this.keyId = this.config.keyId;
    this.keySecret = this.config.keySecret;
    this.serviceAccount = this.config.serviceAccount;
    this.port = this.config.port;

    // Ensures that only supported sensors are added
    this.allowedSensors = new Set(['touch', 'temperature', 'humidity', 'proximity']);
    this.exclude = this.config.excludedTypes || [];
    for (let type of this.exclude) {
        this.allowedSensors.delete(type);
    }

    this.initializeRequestHandler();

    this.deviceMap = new Map();

    if (api) {
        this.api = api;
        this.api.on('didFinishLaunching', this.initialize.bind(this))
    }
}

DisruptivePlatform.prototype = {
    checkRequiredConfig: function() {
        if (!this.config.projectId) {
            this.log('Missing required config: projectId');
            return false;
        }

        if (!this.config.keyId) {
            this.log('Missing required config: keyId');
            return false;
        }

        if (!this.config.keySecret) {
            this.log('Missing required config: keySecret');
            return false;
        }

        if (!this.config.serviceAccount) {
            this.log('Missing required config: serviceAccount');
            return false;
        }

        if (!this.config.port) {
            this.log('Missing required config: port');
            return false;
        }
        return true;
    },

    loadDevices: async function() {
        try {
            this.log("Loading Devices");
            const options = {
                uri: 'http://api.disruptive-technologies.com/v2/projects/' + this.projectId + '/devices?token=' + await this.requestToken(),
                method: 'GET',
                json: true
            };
            const response = await request(options);

            this.validResponse = true;
            return response.devices;
        } catch {
            this.validResponse = false;
            this.log('Did not receive a valid response from cloud.')
        }
    },

    initialize: async function() {
        const devices = await this.loadDevices();
        devices.map(device => this.deviceMap.set(device.name, device));

        const accessoriesCopy = Array.from(this.accessories);
        // Remove accessories with wrong type
        for (const accessory of accessoriesCopy) {
            if(accessory.context.type !== this.deviceMap.get(accessory.context.identifier).type) {
                this.removeAccessory(accessory);
            }
        }

        // Remove excluded accessories
        for (const accessory of accessoriesCopy) {
            if (!this.allowedSensors.has(accessory.context.type)) {
                this.removeAccessory(accessory);
            }
        }

        devices.map(device => this.addAccessoryFromDevice(device));

        this.removeFlaggedAccessories(devices);

        // Starts a timer to check for inactive sensors
        this.statusTimer();
    },

    addAccessoryFromDevice: function(device) {
        if (!this.accessoryMap.has(device.name) && this.allowedSensors.has(device.type)) {
            this.addAccessory(device);
        }
    },

    removeFlaggedAccessories: async function(devices) {
        for (const accessory of this.accessories) {
            if (accessory.context.remove && this.validResponse) {
                let shouldRemove = true;
                for (const device of devices) {
                    if (accessory.context.identifier === device.name) {
                        shouldRemove = false;
                    }
                }
                if (shouldRemove) {
                    this.removeAccessory(accessory);
                }
            }
        }
    },

    updateAccessoryCharacteristics: function(accessory) {
        this.log('Configuring accessory: ' + accessory.context.name + ' ' + accessory.context.identifier);
        const platform = this;

        accessory.on('identify', function(paired, callback) {
            platform.log(accessory.displayName, "identify.");
            callback();
        });

        switch (accessory.context.type) {
            case 'touch': {
                new touchAccessory(this, accessory);
                break;
            }
            case 'temperature': {
                new temperatureAccessory.accessory(this, accessory);
                break;
            }
            case 'humidity': {
                new humidityAccessory.accessory(this, accessory);
                break;
            }
            case 'proximity': {
                new proximityAccessory.accessory(this, accessory);
                break;
            }
        }
    },

    setContext: function(accessory, device) {
        accessory.context.identifier = device.name;
        accessory.context.type = device.type;
        accessory.context.lastEvent = this.getCurrentTimestamp();

        accessory.context.currentTemperature = 0;
        accessory.context.currentRelativeHumidity = 0;
        accessory.context.objectPresent = false;

        accessory.context.batteryStatus = 0;
        accessory.context.fault = 0;
        accessory.context.active = true;

        switch (device.type) {
            case 'touch': {
                break;
            }
            case 'temperature': {
                accessory.context.currentTemperature = device.reported.temperature.value;
                break;
            }
            case 'humidity': {
                accessory.context.currentTemperature = device.reported.humidity.temperature;
                accessory.context.currentRelativeHumidity = device.reported.humidity.relativeHumidity;
                break;
            }
            case 'proximity': {
                accessory.context.objectPresent = (device.reported.objectPresent.state === 'NOT_PRESENT');
                break;
            }
        }
    },

    // Adds undefined context on all cached accessories
    fixContext: function(accessory) {
        accessory.context.lastEvent = accessory.context.lastEvent || this.getCurrentTimestamp();

        accessory.context.currentTemperature = accessory.context.currentTemperature || 0;
        accessory.context.currentRelativeHumidity = accessory.context.currentRelativeHumidity || 0;
        accessory.context.objectPresent = accessory.context.objectPresent || false;

        accessory.context.batteryStatus = accessory.context.batteryStatus || 0;
        accessory.context.fault = accessory.context.fault || 0;
        accessory.context.active = accessory.context.active || true;
    },

    addAccessoryInformation: function(accessory) {
        accessory.getService(Service.AccessoryInformation)
            .setCharacteristic(Characteristic.Name, accessory.context.name)
            .setCharacteristic(Characteristic.Identify, accessory.context.name)
            .setCharacteristic(Characteristic.Manufacturer, 'Disruptive Technologies')
            .setCharacteristic(Characteristic.Model, accessory.context.type)
            .setCharacteristic(Characteristic.SerialNumber, accessory.context.identifier.split('/devices/')[1])
            .setCharacteristic(Characteristic.FirmwareRevision, '1.0.0');
    },

    addAccessory: function(device) {
        this.log('Adding Accessory: ' + device.type + ' ' + device.name);
        let uuid = UUIDGen.generate(device.name);
        let accessory = new Accessory(device.name, uuid);
        accessory.context.name = device.labels.name;
        accessory.context.remove = false;

        this.setContext(accessory, device);
        this.addAccessoryInformation(accessory);

        switch(device.type) {
            case 'touch': {
                accessory.addService(Service.StatelessProgrammableSwitch, device.labels.name);
                break;
            }
            case 'temperature': {
                accessory.addService(Service.TemperatureSensor, device.labels.name);
                break;
            }
            case 'humidity': {
                accessory.addService(Service.HumiditySensor, device.labels.name);
                accessory.addService(Service.TemperatureSensor, device.labels.name);
                break;
            }
            case 'proximity': {
                accessory.addService(Service.ContactSensor, device.labels.name);
                break;
            }
            default: {
                accessory.addService(Service.StatelessProgrammableSwitch, device.labels.name);
                break;
            }
        }
        this.updateAccessoryCharacteristics(accessory);

        this.accessoryMap.set(device.name, accessory);
        this.accessories.push(accessory);
        this.api.registerPlatformAccessories(pluginName, platformName, [accessory]);
    },

    configureAccessory: async function(accessory) {
        accessory.context.remove = true;

        this.accessoryMap.set(accessory.context.identifier, accessory);
        this.accessories.push(accessory);

        this.fixContext(accessory);
        this.updateAccessoryCharacteristics(accessory);
    },

    removeAccessory: function(accessory) {
        this.log('Removing accessory: ' + accessory.context.name + ' ' + accessory.context.identifier);

        for (let i = 0; i < this.accessories.length; i++) {
            if (this.accessories[i].context.identifier === accessory.context.identifier) {
                this.accessories.splice(i, 1);
            }
        }

        this.accessoryMap.delete(accessory.context.identifier);
        this.api.unregisterPlatformAccessories("homebridge-disruptive", "DisruptivePlatform", [accessory]);
    },

    statusTimer: function() {
        for (let accessory of this.accessories)
            this.updateStatus(accessory);
        setTimeout(this.statusTimer.bind(this), 1000*60*10);
    },

    updateStatus: function(accessory) {
        // Check if accessory has responded in the last hour
        if ((this.getCurrentTimestamp() - accessory.context.lastEvent) >= 5*60) {
            accessory.context.fault = 1;
            accessory.context.active = false;
        } else {
            accessory.context.fault = 0;
            accessory.context.active = true;
        }

        switch (accessory.context.type) {
            case 'temperature': {
                temperatureAccessory.updateBatteryStatus(accessory);
                temperatureAccessory.updateStatus(accessory);
                break;
            }
            case 'humidity': {
                humidityAccessory.updateBatteryStatus(accessory);
                humidityAccessory.updateStatus(accessory);
                break;
            }
            case 'proximity':{
                proximityAccessory.updateBatteryStatus(accessory);
                proximityAccessory.updateStatus(accessory);
                break;
            }
        }
    },

    initializeRequestHandler: function() {
        app.post('/event', (request, response) => {
            try {
                const event = request.body.event;
                const accessory = this.accessoryMap.get(event.targetName);
                accessory.context.lastEvent = this.getCurrentTimestamp();

                if (accessory) {
                    switch (event.eventType) {
                        case 'touch': {
                            if (accessory.context.type === 'touch') {
                                accessory.getService(Service.StatelessProgrammableSwitch).getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(0);
                            }
                            break;
                        }
                        case 'temperature': {
                            if (accessory.context.type === 'temperature') {
                                accessory.context.currentTemperature = event.data.temperature.value;
                                accessory.getService(Service.TemperatureSensor).getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.currentTemperature);
                            }
                            break;
                        }
                        case 'humidity': {
                            if (accessory.context.type === 'humidity') {
                                accessory.context.currentRelativeHumidity = event.data.humidity.relativeHumidity;
                                accessory.context.currentTemperature = event.data.humidity.temperature;
                                accessory.getService(Service.HumiditySensor).getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(accessory.context.currentRelativeHumidity);
                                accessory.getService(Service.TemperatureSensor).getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.currentTemperature);
                            }
                            break;
                        }
                        case 'objectPresent': {
                            if (accessory.context.type === 'proximity') {
                                accessory.context.objectPresent = (event.data.objectPresent.state === 'NOT_PRESENT');
                                accessory.getService(Service.ContactSensor).getCharacteristic(Characteristic.ContactSensorState).updateValue(accessory.context.objectPresent);
                            }
                            break;
                        }
                        case 'batteryStatus': {
                            accessory.context.batteryStatus = (event.data.batteryStatus.percentage < 20)? 1 : 0;
                            this.updateStatus(accessory);
                            break;
                        }
                        case 'networkStatus': {
                            this.updateStatus(accessory);
                            break;
                        }
                    }
                }
            } catch (error) {
                this.log('Unable to parse received event' + error);
                response.sendStatus(400);
            }
            response.sendStatus(200);
        });
        const platform = this;
        app.listen(this.port, function(){
            platform.log("Listening for events on port: " + platform.port)
        });
    },

    requestToken: async function () {
        const currentTime = this.getCurrentTimestamp();

        try {
            if (this.tokenExpiration && this.tokenExpiration - currentTime >= 0) {
                return this.token;
            } else {
                const payload = {
                    'iat': currentTime,
                    'exp': currentTime + 3600,
                    'aud': 'https://identity.disruptive-technologies.com/oauth2/token',
                    'iss': this.serviceAccount
                };

                const token = jwt.sign(payload, this.keySecret, {algorithm: 'HS256', header: {kid: this.keyId}});

                const options = {
                    uri: 'https://identity.disruptive-technologies.com/oauth2/token',
                    method: 'POST',
                    json: true,
                    formData: {
                        assertion: token,
                        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer"
                    }
                };
                this.tokenExpiration = currentTime + 3600;
                const response = await request(options);
                return response.access_token;
            }
        } catch (error) {
            this.log('Unable to request JWT access token')
        }
    },

    getCurrentTimestamp: function() {
        return Math.floor(Date.now() / 1000);
    }
};
