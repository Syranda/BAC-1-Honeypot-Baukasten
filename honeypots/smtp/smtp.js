const SMTPServer = require("smtp-server").SMTPServer;
const Honeypot = require('../Honeypot');

class SMTPHoneypot extends Honeypot {
    constructor() {
        super('SMTP');
        
        this.server = new SMTPServer({
            hideSTARTTLS: true,
            onConnect: (session, cb) => {
                const { remoteAddress, remotePort } = session;
                this.log(`New connection from ${remoteAddress}:${remotePort}`);
                this.reportConnect({
                    from: {
                        ip: remoteAddress,
                        port: remotePort
                    }
                });
        
                cb();
            },
            onAuth: (auth, session, cb) => {
                const { remoteAddress, remotePort } = session;  
                this.log(`${remoteAddress}:${remotePort} tries authentication`);
        
                const { method, username, password } = auth;
        
                this.log(`\tWith username '${username}' and password '${password}'`);
        
                this.reportAuthentication({
                    from: {
                        ip: remoteAddress,
                        port: remotePort
                    },
                    [method]: {
                        username,
                        password
                    }
                });
        
                cb('Invalid username or password');
            },
            onClose: (session) => {
                const { remoteAddress, remotePort } = session;
                this.log(`${remoteAddress}:${remotePort} closed connection`);
                this.reportDisconnect({
                    from: {
                        ip: remoteAddress,
                        port: remotePort
                    }
                });
            }
        });

        this.startIfEnabled();

    }

    start() {
        this.config.enabled = true;
        const { port, bind } = this.config;
        this.server.listen(port, bind, () => {
            this.log(`SMTP Honeypot is listening on ${bind}:${port}`);
        });
    }

    stop() {
        this.config.enabled = false;
        this.server.close(() => {
            this.log('Stopped SMTP Honeypot');
        })
    }

    isRunning() {
        return this.server.server.listening;
    }

}

module.exports = {
    SMTPHoneypot
}