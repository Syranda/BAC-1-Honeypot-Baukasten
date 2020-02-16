const fs = require('fs');
const { reportsFile, logFile } = require('./config.json').logging;
const geoip = require('geoip-country');
const countries = require("i18n-iso-countries");
const fetch = require('node-fetch');

if (fs.existsSync('./logs/') === false) {
    fs.mkdirSync('./logs');
}

let reports = fs.existsSync(reportsFile + '') === true ? JSON.parse(fs.readFileSync(reportsFile + '')) : {};

function log(service, message) {
    const now = new Date();
    const out = `${now.toDateString()} ${now.toLocaleTimeString()} [${service}] ${message}`;
    console.log(out);
    fs.writeFileSync(logFile + '', out  + "\n", { flag: 'a' });
}

function report(service, type, data) {

    service = service.toString();
    type = type.toString();

    if (!reports[service]) {
        reports[service] = [];
    }

    if (data.from.ip) {
        const originCode = geoip.lookup(data.from.ip);
        if (originCode) {
            data.from.origin = countries.getName(originCode.country, 'en');
        }
    }

    const now = new Date();

    const report = {
        time: `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
        timeISO: now.toISOString(),
        type,
        data
    };
    reports[service].push(report);

    fs.writeFileSync(reportsFile + '', JSON.stringify(reports, null, 2), { flag: 'w' });

    const { enabled, url } = require('./config.json').reportHook;
    if (enabled == true) {
        const remoteReport = Object.assign({}, report);
        remoteReport.service = service;
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(remoteReport)
        })
        .then(res => {})
        .catch(e => console.error(e));
    } 

}

module.exports = {
    log,
    report,
    reports
};