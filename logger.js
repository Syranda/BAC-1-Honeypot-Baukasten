const fs = require('fs');
const { reportsFile, logFile } = require('./config.json').logging;

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

    const now = new Date();

    reports[service].push({
        time: `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`,
        timeISO: now.toISOString(),
        type,
        data
    });

    fs.writeFileSync(reportsFile + '', JSON.stringify(reports, null, 2), { flag: 'w' });
}

module.exports = {
    log,
    report
};