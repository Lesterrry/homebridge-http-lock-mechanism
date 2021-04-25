var Service, Characteristic
const packageJson = require('./package.json')
const miio = require('miio');

module.exports = function (homebridge) {
  Service = homebridge.hap.Service
  Characteristic = homebridge.hap.Characteristic
  homebridge.registerAccessory('homebridge-http-lock-mechanism', 'HTTPLock', HTTPLock)
}

function HTTPLock (log, config) {
  this.log = log
  miio.device({ address: config['ip'], token: config['token'] }).then(device => this.device = device).catch(function(err){ this.log.error("[x] Init error"); this.log.error(err) })
  this.name = config.name

  this.autoLock = config.autoLock || false
  this.autoLockDelay = config.autoLockDelay || 10

  this.manufacturer = config.manufacturer || packageJson.author.name
  this.serial = config.serial || this.apiroute
  this.model = config.model || packageJson.name
  this.firmware = config.firmware || packageJson.version

  this.username = config.username || null
  this.password = config.password || null
  this.timeout = config.timeout || 5000
  this.http_method = config.http_method || 'GET'

  this.service = new Service.LockMechanism(this.name)
}

HTTPLock.prototype = {
  identify: function (callback) {
    this.log('[!] Identify requested!')
    callback()
  },

  _getStatus: function (callback) {
    //TODO
  },

  setLockTargetState: function (value, callback) {
    this.device.call("set_power", [value ? "on" : "off"]).then(result => {
        this.log.debug("[*] set_power result: " + result);
      if(result[0] === "ok") {
          this.service.getCharacteristic(Characteristic.LockCurrentState).updateValue(value);
          callback()
      } else {
          callback(new Error(result[0]));
      }
    }).catch(function(err) {
      this.log.error("[x] set_power error: " + err);
      callback(err);
    });
  },

  getServices: function () {
    this.informationService = new Service.AccessoryInformation()
    this.informationService
      .setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
      .setCharacteristic(Characteristic.Model, this.model)
      .setCharacteristic(Characteristic.SerialNumber, this.serial)
      .setCharacteristic(Characteristic.FirmwareRevision, this.firmware)

    this.service
      .getCharacteristic(Characteristic.LockTargetState)
      .on('set', this.setLockTargetState.bind(this))

    this._getStatus(function () {})

    setInterval(function () {
      this._getStatus(function () {})
    }.bind(this), this.pollInterval * 1000)

    return [this.informationService, this.service]
  }
}
