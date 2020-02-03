const http = require('http');
const express = require('express');
const Honeypot = require('../Honeypot');

class HTTPHoneypot extends Honeypot {
    constructor() {
        super('HTTP');

        this.honeypot = express();
        this.honeypot.use((req, res, next) => {

            const { method, path } = req;    
            const { remoteAddress, remotePort } = req.socket;
        
            this.log(`${remoteAddress}:${remotePort} accesses resource ${method} ${path}`);
            this.report('Resource', {
                from: {
                    ip: remoteAddress,
                    port: remotePort
                },
                resource: {
                    method,
                    path
                }
            }); 
            if (req.headers.authorization) {
                this.log(`${remoteAddress}:${remotePort} tries to authenticate`)
                const [ authMethod, token] = req.headers.authorization.split(' ');
        
                switch (authMethod) {
                    case 'Basic': 
                        const [username, password] = Buffer.from(token, 'base64').toString().split(':');
        
                        this.log(`\tWith method '${authMethod}', username '${username}' and password '${password}'`);
                        this.reportAuthentication({
                            from: {
                                ip: remoteAddress,
                                port: remotePort
                            },
                            [authMethod]: {
                                username,
                                password
                            }
                        });
                        break;
                    default:                
                    this.log(`\tWith method '${method}' and token '${token}'`);
                        break;
                }
            }
            res.status(401).header({
                'WWW-Authenticate': 'Basic realm="User Visible Realm", charset="UTF-8"'
            }).end();
        });

        this.server = http.createServer(this.honeypot);
        this.server.on('connection', client => {    
            const { remoteAddress, remotePort } = client;
            this.log(`New connection from ${remoteAddress}:${remotePort}`);
            this.reportConnect({
                from: {
                    ip: remoteAddress,
                    port: remotePort
                },
            });
        });

    }

    start() {
        const { port, bind } = this.config;
        this.server.listen(port, bind, () => {
            this.log(`HTTP Honeypot is listening on ${bind}:${port}`);
        });
    }

    stop() {
        this.server.close(() => {
            this.log(`Stopped HTTP Honeypot`);
        });
    }

    isRunning() {
        return this.server.listening;
    }

}
module.exports = {
    HTTPHoneypot
}