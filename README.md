# Disruptive Cloud Homebridge

## Installation

Homebridge and any homebridge plugins should be downloaded globally using the *-g* flag.

    sudo npm install -g homebridge
    sudo npm install -g homebridge-disruptive

If you don't have Homebridge installed, [check the repository](https://github.com/nfarina/homebridge) for detailed setup instructions.

## Dynamic Accessories

Homebridge will request all devices from the specified project on startup, and dynamically add them as accessories in HomeKit. A server will be set up, and will listen to specified the specified port for Sensor Events from Data Connector. 

You will have to manually add a Data Connector on the Disruptive Cloud dashboard.

Note: Newly added devices will not be requested runtime. To update accessory list with new devices, restart Homebridge. 
 
 ## Config File
 Before you can run Homebridge, configuration is needed. It will not start if any of the required fields is left out, but the optional fields can be left out entirely.
 
 ```
Required fields:
    platform:           "DisruptivePlatform"
    projectId:          "<Project ID from Disruptive Cloud>"
    serviceAccount:     "<Service Account Email>"
    keyId:              "<Service Account Key ID>"
    keySecret:          "<Key Secret generated on Service Account creation>"
    port:               <Listening for Sensor Events on port>

Optional fields:
    excludedTypes:      ["touch", "temperature", "humidity", "proximity"]
    excludedSensors:    ["projects/<Project ID>/devices/<Device ID>", ...]

```

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
      "port": 80,
      "excludedTypes": ["touch", "temperature"]
    }
  ]
}
```

## BalenaCloud
- Download the balenaCloud directory from the repository: *https://github.com/mmoldsvor/DisruptiveHomebridge*
- Edit the *config.json* file as specified above, by adding all required config fields. 
    - If running on balena, the port needs to be 80.
- Push to your balenaCloud device using Balena CLI: 
    - balena push \<DeviceName> (--emulated)
    - *For more information, visit https://www.balena.io/docs/learn/deploy/deployment*
- Enable Public URL on the balena dashboard
- Add Public URL to Data Connector on Disruptive Cloud Studio:
    - *https://\<PUBLIC DEVICE URL>/event*
 
 *Important: Do not specify port when adding the public URL to the Data Connector* 

The Balena device sets up a Homebridge Dashboard on a port specified in the docker-compose.yml file.
Port 8080 is used by default. This port is exposed by the public URL. To restrict access, change the port to a different port. 

The dashboard can be accessed with:
- *http://\<PUBLIC DEVICE URL>:8080*
- *\<Local IP Adress of Device>:\<Port>*
    - Log in to the Configuration User Interface with the credentials:
        - Username: admin
        - Password: admin

*The docker images linked below are for arm32v6 architecture. If running on another architecture, change the Dockerfile.*
