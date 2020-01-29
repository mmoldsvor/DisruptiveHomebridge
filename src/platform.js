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
    if (!this.checkRequiredConfig()) {
        return;
    }

    this.log = log;
    this.config = config;
    this.url = 'http://api.disruptive-technologies.com/v2/';
    this.accessories = [];
    this.accessoryMap = new Map();

    this.token = '';
    this.tokenExpiration = 0;

    this.projectId = this.config.projectId;
    this.keyId = this.config.keyId;
    this.keySecret = this.config.keySecret;
    this.serviceAccount = this.config.serviceAccount;

    this.initializeRequestHandler();

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

        return true;
    },

    loadDevices: async function() {
        const options = {
            uri: 'http://api.disruptive-technologies.com/v2/projects/' + this.projectId + '/devices?token=' + await this.requestToken(),
            method: 'GET',
            json: true
        };
        const response = await request(options);
        this.log(response);
        return response.devices;
    },

    initialize: async function() {
        const devices = await this.loadDevices();
        devices.map(device => this.addAccessoryFromDevice(device));
    },

    addAccessoryFromDevice: function(device) {
        if (!this.accessoryMap.has(device.name)) {
            this.addAccessory(device);
        }
    },

    updateAccessoryCharacteristics: function(accessory) {
        this.log('Configuring accessory ' + accessory.displayName);
        const platform = this;

        accessory.on('identify', function(paired, callback) {
            platform.log(accessory.displayName, "identify.");
            callback();
        });


        accessory.getService(Service.BatteryService)
            .getCharacteristic(Characteristic.BatteryLevel)
            .on('get', function(callback) {
                accessory.getService(Service.BatteryService).getCharacteristic(Characteristic.BatteryLevel).updateValue(accessory.context.batteryStatus);
                callback();
            });

        switch (accessory.context.type) {
            case 'touch': {
                new touchAccessory(this, accessory);
                break;
            }
            case 'temperature': {
                new temperatureAccessory(this, accessory);
                break;
            }
            case 'humidity': {
                new humidityAccessory(this, accessory);
                break;
            }
            case 'proximity': {
                new proximityAccessory(this, accessory);
                break;
            }
            default: {
                new touchAccessory(this, accessory);
            }
        }
    },

    setContext: function(accessory, device) {
        accessory.context.identifier = device.name;
        accessory.context.type = device.type;

        //Default values
        accessory.context.currentTemperature = 0;
        accessory.context.currentRelativeHumidity = 0;
        accessory.context.objectPresent = true;
        accessory.context.batteryStatus = 0;
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
        let uuid = UUIDGen.generate(device.name);
        let accessory = new Accessory(device.name, uuid);
        accessory.context.name = device.labels.name;

        this.log(device.labels.name);

        switch(device.type) {
            case 'touch': {
                accessory.addService(Service.StatelessProgrammableSwitch, 'Touch');
                break;
            }
            case 'temperature': {
                accessory.addService(Service.TemperatureSensor, 'Temperature');
                break;
            }
            case 'humidity': {
                accessory.addService(Service.HumiditySensor, 'Humidity');
                accessory.addService(Service.TemperatureSensor, 'Temperature');
                break;
            }
            case 'proximity': {
                accessory.addService(Service.ContactSensor, 'Proximity');
                break;
            }
            default: {
                accessory.addService(Service.StatelessProgrammableSwitch, 'Default');
                break;
            }
        }
        accessory.addService(Service.BatteryService, 'Battery Status');
        accessory.addService(Service.AccessoryInformation, 'Information');

        this.setContext(accessory, device);
        this.addAccessoryInformation(accessory);
        this.updateAccessoryCharacteristics(accessory);

        this.accessoryMap.set(device.name, accessory);
        this.accessories.push(accessory);
        this.api.registerPlatformAccessories("homebridge-disruptive", "DisruptivePlatform", [accessory]);
    },

    configureAccessory: function(accessory) {
        this.accessoryMap.set(accessory.context.identifier, accessory);
        this.accessories.push(accessory);
        this.updateAccessoryCharacteristics(accessory)
    },

    initializeRequestHandler: function() {
        app.post('/event', (request, response) => {
            try {
                const event = request.body.event;
                const accessory = this.accessoryMap.get(event.targetName);
                if (accessory) {
                    switch (event.eventType) {
                        case 'touch': {
                            if (accessory.context.type === 'touch') {
                                accessory.getService(Service.StatelessProgrammableSwitch).getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(0);
                                this.log('Touch Event');
                            }
                            break;
                        }
                        case 'temperature': {
                            if (accessory.context.type === 'temperature') {
                                accessory.context.currentTemperature = event.data.temperature.value;
                                accessory.getService(Service.TemperatureSensor).getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.currentTemperature);
                                this.log('Temperature Event');
                            }
                            break;
                        }
                        case 'humidity': {
                            if (accessory.context.type === 'humidity') {
                                accessory.context.currentRelativeHumidity = event.data.humidity.relativeHumidity;
                                accessory.context.currentTemperature = event.data.humidity.temperature;
                                accessory.getService(Service.HumiditySensor).getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(accessory.context.currentRelativeHumidity);
                                accessory.getService(Service.TemperatureSensor).getCharacteristic(Characteristic.CurrentTemperature).updateValue(accessory.context.currentTemperature);
                                this.log('Humidity Event');
                            }
                            break;
                        }
                        case 'objectPresent': {
                            if (accessory.context.type === 'proximity') {
                                accessory.context.objectPresent = (event.data.objectPresent.state === 'PRESENT');
                                accessory.getService(Service.ContactSensor).getCharacteristic(Characteristic.ContactSensorState).updateValue(accessory.context.objectPresent);
                                this.log('Object Present Event');
                            }
                            break;
                        }
                        default: {

                            break;
                        }
                    }
                }
            } catch (error) {
                this.log('Unable to parse received event');
            }
            response.sendStatus(200);
        });
        app.listen(80);
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
