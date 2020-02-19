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

    this.controller = {
        'touch': touchAccessory,
        'temperature': temperatureAccessory,
        'humidity': humidityAccessory,
        'proximity': proximityAccessory
    };

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
    this.excludedTypes = this.config.excludedTypes || [];
    this.log("Excluding sensors with types: " + this.excludedTypes);
    for (let type of this.excludedTypes) {
        this.allowedSensors.delete(type);
    }

    this.excludedSensors = new Set(this.config.excludedSensors || []);
    this.log("Excluding sensors with identifiers: " + Array.from(this.excludedSensors));

    this.initializeRequestHandler();

    this.deviceMap = new Map();

    if (api) {
        this.api = api;
        this.api.on('didFinishLaunching', this.initialize.bind(this))
    }
}

DisruptivePlatform.prototype = {
    checkRequiredConfig: function() {
        /**
         * Checks if all required configuration parameters are present in the config.json file.
         */
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
        /**
         * Requests the all devices from Disruptive Technologies Cloud, and returns a promise of the devices.
         */

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
        /**
         * Initializes all loaded devices, and removes flagged and excluded devices.
         */
        const devices = await this.loadDevices();
        devices.map(device => this.deviceMap.set(device.name, device));

        const accessoriesCopy = Array.from(this.accessories);
        for (const accessory of accessoriesCopy) {
            // Remove accessories with wrong type
            if(this.deviceMap.has(accessory.context.identifier ) && accessory.context.type !== this.deviceMap.get(accessory.context.identifier).type) {
                this.removeAccessory(accessory);
            }

            // Remove excluded accessories
            else if (!this.allowedSensors.has(accessory.context.type)) {
                this.removeAccessory(accessory);
            }

            // Remove excluded sensors
            else if (this.excludedSensors.has(accessory.context.identifier)) {
                this.removeAccessory(accessory);
            }
        }

        // Adds all loaded devices as accessories
        devices.map(device => this.addAccessoryFromDevice(device));

        this.removeFlaggedAccessories(devices);

        // Starts a timer to check for inactive sensors
        this.statusTimer();
    },

    addAccessoryFromDevice: function(device) {
        /**
         * Checks if three conditions are met. 1) The device does not already exist. 2) The device type has not been excluded. 3) The device identifier has not been excluded.
         * @param {Object} device A singular device loaded from the Disruptive Technologies Cloud.
         */
        if (!this.accessoryMap.has(device.name)) {
            if (this.allowedSensors.has(device.type) && !this.excludedSensors.has(device.name)) {
                this.addAccessory(device);
            }
        } else {
            // Updates sensor data of cached accessories
            this.updateSensorData(this.accessoryMap.get(device.name), device);
        }
    },

    removeFlaggedAccessories: async function(devices) {
        /**
         * Removes all devices from cached accessories that are no longer present in the Disruptive Technologies Cloud.
         * @param {Object} devices  Loaded devices
         */
        const accessoriesCopy = Array.from(this.accessories);

        for (const accessory of accessoriesCopy) {
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
        /**
         * Adds all Services if they do not already exist, and sets up the device according to its type.
         */

        this.log('Configuring accessory: ' + accessory.context.name + ' ' + accessory.context.identifier);
        const platform = this;

        accessory.on('identify', function(paired, callback) {
            platform.log(accessory.displayName, "identify.");
            callback();
        });

        switch (accessory.context.type) {
            case 'touch': {
                if (!accessory.getService(Service.StatelessProgrammableSwitch))
                    accessory.addService(Service.StatelessProgrammableSwitch, accessory.context.name);

                new touchAccessory.accessory(this, accessory);
                break;
            }
            case 'temperature': {
                if (!accessory.getService(Service.TemperatureSensor))
                    accessory.addService(Service.TemperatureSensor, accessory.context.name);

                new temperatureAccessory.accessory(this, accessory);
                break;
            }
            case 'humidity': {
                if (!accessory.getService(Service.HumiditySensor))
                    accessory.addService(Service.HumiditySensor, accessory.context.name);

                if (!accessory.getService(Service.TemperatureSensor))
                    accessory.addService(Service.TemperatureSensor, accessory.context.name);

                new humidityAccessory.accessory(this, accessory);
                break;
            }
            case 'proximity': {
                if (!accessory.getService(Service.ContactSensor))
                    accessory.addService(Service.ContactSensor, accessory.context.name);

                new proximityAccessory.accessory(this, accessory);
                break;
            }
        }
    },

    setDefaultSensorData: function(accessory) {
        /**
         * Sets default values for all sensors, and adds specific data according to device type.
         */
        accessory.context.lastEvent = 0;
        accessory.context.statusLowBattery = 0;
        accessory.context.fault = 0;
        accessory.context.active = true;
    },

    updateSensorData: function(accessory, device) {
        if (device.reported.networkStatus)
            accessory.context.lastEvent = Math.round(new Date(device.reported.networkStatus.updateTime)/1000);
        if (device.reported.batteryStatus)
            accessory.context.statusLowBattery = (device.reported.batteryStatus.percentage < 20)? 1 : 0;
        if (device.type !== 'touch'){
            this.controller[accessory.context.type].setContext(accessory, device);
        }
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
        accessory.context.identifier = device.name;
        accessory.context.type = device.type;

        accessory.context.remove = false;

        this.updateAccessoryCharacteristics(accessory);
        this.setDefaultSensorData(accessory);
        this.updateSensorData(accessory, device);
        this.addAccessoryInformation(accessory);

        this.accessoryMap.set(device.name, accessory);
        this.accessories.push(accessory);
        this.api.registerPlatformAccessories(pluginName, platformName, [accessory]);
    },

    configureAccessory: async function(accessory) {
        accessory.context.remove = true;

        this.accessoryMap.set(accessory.context.identifier, accessory);
        this.accessories.push(accessory);

        this.setDefaultSensorData(accessory);
        this.updateAccessoryCharacteristics(accessory);

        // Removes Services present in older versions
        this.removeUnusedServices(accessory);
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

    removeUnusedServices: function(accessory) {
    let services = Array.from(accessory.services);
    for (let service of services) {
        if (!this.controller[accessory.context.type].allowedServices.has(service.UUID))
            accessory.removeService(service);
        }
    },

    statusTimer: function() {
        /**
         * Starts a timer that checks if device has responded in the hour.
         */
        for (let accessory of this.accessories)
            this.updateStatus(accessory);
        setTimeout(this.statusTimer.bind(this), 1000*60*60);
    },

    updateStatus: function(accessory) {
        /**
         * Updates StatusBatteryLow, StatusActive and StatusFault for all relevant devices
         */

        // Check if accessory has responded in the last hour
        if ((this.getCurrentTimestamp() - accessory.context.lastEvent) >= 60*60) {
            accessory.context.fault = 1;
            accessory.context.active = false;
        } else {
            accessory.context.fault = 0;
            accessory.context.active = true;
        }

        if (accessory.context.type !== 'touch'){
            this.controller[accessory.context.type].updateBatteryStatus(accessory);
            this.controller[accessory.context.type].updateStatus(accessory);
        }
    },

    initializeRequestHandler: function() {
        /**
         * Starts a server that listens to route /event at a given port
         */
        app.post('/event', (request, response) => {
            try {
                const event = request.body.event;
                const accessory = this.accessoryMap.get(event.targetName);

                if (accessory) {
                    accessory.context.lastEvent = this.getCurrentTimestamp();

                    this.controller[accessory.context.type].handleEvent(accessory, event);
                    switch (event.eventType) {
                        case 'batteryStatus': {
                            accessory.context.statusLowBattery = (event.data.batteryStatus.percentage < 20)? 1 : 0;
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
                this.log('Unable to parse received event: ' + error);
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
        /**
         * Requests JWT access token if no active token is found. Token expires after 1 hour.
         */
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
