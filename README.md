# Disruptive Cloud Homebridge

## Installation

Homebridge and any homebridge plugins should be downloaded globally using the *-g* flag.

    sudo npm install -g homebridge
    sudo npm install -g homebridge-disruptive

If you don't have Homebridge installed, [check the repository](https://github.com/nfarina/homebridge) for detailed setup instructions.

## Dynamic Accessories:

Homebridge will request all devices from the specified project on startup, and dynamically add them as accessories in HomeKit. A server will be set up, and will listen to specified the specified port for Sensor Events from Data Connector. 

You will have to manually add a Data Connector on the Disruptive Cloud dashboard.

Note: Newly added devices will not be requested runtime. To update accessory list with new devices, restart Homebridge. 
 
 ## Example config.json:

```
{
  "platforms": [
    {
      "platform": "DisruptivePlatform",
      "projectId": "<Project ID from Disruptive Cloud>",
      "serviceAccount": "<Service Account Email>",
      "keyId": "<Service Account Key ID>",
      "keySecret": "<Key Secret generated on Service Account creation>",
      "port": <Listening for Sensor Events on port>
    }
  ]
}
```

### Optional config:
```
- "excludedTypes": ["touch", "temperature", "humidity", "proximity"]
```

## BalenaCloud
- Download the balenaCloud directory from the repository: .
- Push to your balenaCloud device using Balena CLI: 
    - balena push \<DeviceName> (--emulated)
    - *For more information, visit https://www.balena.io/docs/learn/deploy/deployment*
- Enable Public URL on the balena dashboard
- Add Public URL to Data Connector on Disruptive Cloud Studio:
    - *https://\<PUBLIC DEVICE URL>/event*
- Open *http://\<PUBLIC DEVICE URL>:8080* in a web browser.
    - *Note: port 8080 is not open for https*.
- Log in to the Configuration User Interface with the credentials:
    - Username: admin
    - Password: admin
- Add plugin *homebridge-disruptive* on the plugins tab, and add config. 

*The docker images linked below are for arm32v6 architecture. If running on another architecture, change the docker-compose.yml file and the Dockerfile in the nginx directory.*
