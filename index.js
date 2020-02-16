const express = require('express');
const https = require('https');
const fs = require('fs');

const config = require('./config.json');
const { bind, port, auth, ssl } = config.webService;
const app = express();
const bodyParser = require('body-parser');

const { log , reports} = require('./logger');
const { SSHHoneypot } = require('./honeypots/ssh/ssh');
const { TelnetHoneypot } = require('./honeypots/telnet/telnet');
const { SMTPHoneypot } = require('./honeypots/smtp/smtp');
const { FTPHoneypot } = require('./honeypots/ftp/ftp');
const { HTTPHoneypot } = require('./honeypots/http/http');

let honeypots;

function initHoneypots() {
    honeypots = {
        'SSH': new SSHHoneypot(),
        'Telnet': new TelnetHoneypot(),
        'SMTP': new SMTPHoneypot(),
        'HTTP': new HTTPHoneypot(),
        'FTP': new FTPHoneypot()
    }
}

function stopAllHoneypots() {
    if (!honeypots) {
        return;
    }
    Object.keys(honeypots).forEach(key => {
        if (honeypots[key].isRunning() === true) {
            honeypots[key].stop();
        } 
    });
}

app.use(bodyParser.json());
app.use((req, res, next) => {
    if (auth.enabled) {
        let authHeader = req.headers.authorization;
        if (!authHeader) {
            res.header({
                'WWW-Authenticate': 'Basic realm="User Visible Realm"'
            }).sendStatus(401);
            return;
        }

        try {

            let [ username, password ] = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf-8').split(':');
            if (username !== auth.username|| password !== auth.password) {
                res.header({
                    'WWW-Authenticate': 'Basic realm="User Visible Realm"'
                }).sendStatus(401);
                return;
            }

        } catch (e) {
            res.header({
                'WWW-Authenticate': 'Basic realm="User Visible Realm"'
            }).sendStatus(401);
            return;
        }

    }
    next();
});

app.get('/honeypot/services', (req, res) => {
   
    res.json(Object.keys(honeypots).map(hp => {
        return {
            service: hp,
            online: honeypots[hp].isRunning()
        }
    }));

});

app.get('/honeypot/config', (req, res) => {
    const config = require('./config.json').honeypots;
    res.json(config);
});

app.post('/honeypot/config', (req, res) => {
    const { service, bind, port } = req.body;
    const hp = honeypots[service];
    hp.config.bind = bind;
    hp.config.port = port;
    saveConfig();

    const restart = hp.isRunning();
    if (restart) {
        hp.stop();
        hp.start();
    }

    res.sendStatus(200);
});

app.get('/honeypot/report', (req, res) => {
    res.json(reports);
});

app.post('/honeypot/stop', (req, res) => {
    const { service } = req.body;

    if (!service) {
        res.sendStatus(400);
        return;
    }

    honeypots[service].stop();
    res.sendStatus(200);
    saveConfig();

});

app.post('/honeypot/start', (req, res) => {
    const { service } = req.body;
    if (!service) {
        res.sendStatus(400);
        return;
    }

    honeypots[service].start();
    res.send(service);
    saveConfig();

});

app.get('/honeypot/reportHookConfig', (req, res) => {
    const config = require('./config.json');
    res.json(config.reportHook);
});

app.post('/honeypot/reportHookConfig', (req, res) => {
    const config = require('./config.json');
    const { enableReportHook, url } = req.body;
    console.log(enableReportHook);
    config.reportHook.enabled = enableReportHook ? true : false;
    config.reportHook.url = url;
    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
    res.sendStatus(200);
});

initHoneypots();

let server;
if (ssl.enabled === true && fs.existsSync(ssl.key) && fs.existsSync(ssl.cert)) {
    log('Main Service', 'Enabling SSL...');
    server = https.createServer({
        key: fs.readFileSync(ssl.key),
        cert: fs.readFileSync(ssl.cert),
        passphrase: ssl.passphrase
    }, app);
} else {
    server = app;
}

server.listen(port, bind, () => {
    log('Main Service', `Service listening on ${bind}:${port}`);
});


function saveConfig() {
    const config = require('./config.json');

    Object.keys(honeypots).forEach(key => {
        const configKey = key.toLowerCase() + 'Config';
        config.honeypots[configKey] = honeypots[key].config;
    });

    fs.writeFileSync('config.json', JSON.stringify(config, null, 2));

}