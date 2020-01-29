module.exports = function (homebridge) {
    let DisruptivePlatform = require('./src/platform.js')(homebridge);
    homebridge.registerPlatform('homebridge-disruptive', 'DisruptivePlatform', DisruptivePlatform, true);
};
