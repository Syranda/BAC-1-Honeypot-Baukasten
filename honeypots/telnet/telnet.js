const telnet = require('ts-telnet');
const Honepot = require('../Honeypot');

class TelnetHoneypot extends Honepot {
    constructor() {
        super('Telnet');
    }

    createTelnetServer() {
        const { bind, port } = this.config;        
        let server = new telnet.Server(bind, port);

        server.on('connection', async client => {
            const { remoteAddress, remotePort } = client.socket;

            this.log(`New connection from ${remoteAddress}:${remotePort}`);
            this.reportConnect({
                from: {
                    ip: remoteAddress,
                    port: remotePort
                }
            });

            client.on('end', () => {
                this.log(`${remoteAddress}:${remotePort} closed connection`);
                this.reportDisconnect({
                    from: {
                        ip: remoteAddress,
                        port: remotePort
                    }
                });
            });

            let username = (await client.ask('login: ')).replace(/\r/g, '');        
            this.log(`${remoteAddress}:${remotePort} tries authentication`)

            while (client) {
                let password = (await client.ask('Password: ', true)).replace(/\r/g, '');
                this.log(`\tWith username '${username}' and password '${password}'`);

                this.reportAuthentication({
                    from: {
                        ip: remoteAddress,
                        port: remotePort
                    },
                    password: {
                        username,
                        password
                    }
                });

                client.send('');
                client.send('Login failed.');
            }

        });
        server.on('listening', () => {
            this.log(`Telnet Honeypot is listening on ${bind}:${port}`);
        });
        return server;
    }

    start() {
        this.server = this.createTelnetServer();
    }

    stop() {
        this.server.server.close(() => {
            this.log('Stopped Telnet Honepot');
        })        
    }

}

module.exports = {
    TelnetHoneypot
}