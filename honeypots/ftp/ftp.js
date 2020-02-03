const FtpSrv = require('ftp-srv');
const bunyan = require('bunyan');
const Honeypot = require('../Honeypot');

class FTPHoneypot extends Honeypot {
    constructor() {
        super('FTP');
        const { bind, port } = this.config;
        this.server = new FtpSrv({
            url: `ftp://${bind}:${port}`,
            log: bunyan.createLogger({
                name: 'NULL LOG',
                streams: [{path: './ftp.log'}]
            })
        });
        
        this.server.on('login', ({ connection, username, password }, resolve, reject) => {
            const { remoteAddress, remotePort } = connection.commandSocket;
            this.log(`New connection from ${remoteAddress}:${remotePort}`);
            this.log(`${remoteAddress}:${remotePort} tries to authenticate`)
            this.log(`\tWith username '${username}' and password '${password}'`);
            this.reportConnect({
                from: {
                    ip: remoteAddress,
                    port: remotePort
                },
            });
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
        
            reject('Incorrect username / password');
        });
        
        this.server.on('disconnect', ({connection}) => {    
            const { remoteAddress, remotePort } = connection.commandSocket;
            this.log(`${remoteAddress}:${remotePort} closed connection`);
            this.reportDisconnect({
                from: {
                    ip: remoteAddress,
                    port: remotePort
                },
            });
        });

    }

    start() {
        const { bind, port } = this.config;
        this.server.listen().then(() => {
            this.log(`FTP Honeypot is listening on ${bind}:${port}`);
        });
    }

    stop() {
        this.server.close();
        this.log(`Stopped FTP Honeypot`);
    }

    isRunning() {
        return this.server.server.listening;
    }

}

module.exports = {
    FTPHoneypot
}