const express = require('express');

const config = require('./config.json');
const MODE = process.env.NODE_END_MODE || config.webService.mode;
const PORT = process.env.NODE_ENV_HP_PORT || config.webService.port;
const app = express();

const { log , reports} = require('./logger');
const { SSHHoneypot } = require('./honeypots/ssh/ssh');
const { TelnetHoneypot } = require('./honeypots/telnet/telnet');
const { SMTPHoneypot } = require('./honeypots/smtp/smtp');
const { FTPHoneypot } = require('./honeypots/ftp/ftp');
const { HTTPHoneypot } = require('./honeypots/http/http');

const honeypots = {
    'SSH': new SSHHoneypot(),
    'Telnet': new TelnetHoneypot(),
    'SMTP': new SMTPHoneypot(),
    'HTTP': new HTTPHoneypot(),
    'FTP': new FTPHoneypot()
}

app.listen(PORT, () => {
    log('Main Service', `Service mode: ${MODE}`);
    log('Main Service', `Service Started on port ${PORT}`);


    const { SSH, Telnet, HTTP, FTP, SMTP } = honeypots;
    SSH.start();
    Telnet.start();
    HTTP.start();
    FTP.start();
    SMTP.start();
    

});


app.get('/honeypot/services', (req, res) => {
   
    res.json(Object.keys(honeypots).map(hp => {
        return {
            service: hp,
            online: honeypots[hp].isRunning()
        }
    }));

});

app.get('/honeypot/reports', (req, res) => {
    res.json(reports);
});
