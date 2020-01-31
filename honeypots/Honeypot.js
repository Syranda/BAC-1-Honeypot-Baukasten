const { log, report } = require('../logger');

class Honeypot {

    constructor(service, configName) {
        this.service = service;
        this.config = require('../config.json').honeypots[configName ? configName : service.toLowerCase() + "Config"];
    }

    log(message) {
        log(this.service, message);
    }

    report(type, data) {
        report(this.service, type, data);
    }

    reportConnect(data) {
        this.report('Connect', data);;
    }

    reportDisconnect(data) {
        this.report('Disconnect', data);;
    }

    reportAuthentication(data) {
        this.report('Authentication', data);;
    }

    start() {
        throw new Error('Must be implemented by subclass');
    }

    stop() {
        throw new Error('Must be implemented by subclass');
    }

};


module.exports = Honeypot;