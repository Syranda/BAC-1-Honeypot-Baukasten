const ssh = require('ssh2');
const fs = require('fs');
const Honeypot = require('../Honeypot');

class SSHHoneypot extends Honeypot {
    constructor() {
        super('SSH');
        
        const { bind, port, hostKeys } = this.config;

        this.server = new ssh.Server({
            hostKeys: hostKeys.map(key => fs.readFileSync(key + '')),
        }, (client, info) => {
            const { ip, port } = info;
            const { identRaw } = info.header;
            this.log(`New connection from ${ip}:${port} (${identRaw})`);
            this.reportConnect({
                from: {
                    ip,
                    port,
                    identRaw
                }
            });
        
            client.on('authentication', (ctx) => {
        
                const { username, method } = ctx;
        
                this.log(`${ip}:${port} tries authentication (Method: ${method})`)
        
                switch (ctx.method) {
                    case 'password':
                        const { password } = ctx;
                        this.log(`\tWith username '${username}' and password '${password}'`);
                        this.reportAuthentication({
                            from: {
                                ip,
                                port,
                                identRaw
                            },
                            [method]: {
                                username,
                                password
                            }
                        });
                        return ctx.reject(['keyboard-interactiv', 'publickey', 'password'], false);
                    case 'publickey':
                        const { key, signature } = ctx;
                        this.reportAuthentication({
                            from: {
                                ip,
                                port,
                                identRaw
                            },
                            [method]: {
                                username,
                                key,
                                signature
                            }
                        });
                        return ctx.reject(['keyboard-interactiv', 'publickey', 'password'], false);
                    default:
                        return ctx.reject(['keyboard-interactiv', 'publickey', 'password'], false);
                }
        
            });
        
            client.on('end', () => {
                this.log(`${ip}:${port} (${identRaw}) closed connection`);
                this.reportDisconnect({
                    from: {
                        ip,
                        port,
                        identRaw
                    }
                });
            
            });
        
        });

    }

    start() {
        const { port, bind } = this.config;
        this.server.listen(port, bind, () => {
            this.log(`SSH Honeypot is listening on ${bind}:${port}`);
        });    
    }

    stop() {
        this.server.close(() => {
            this.log(`Stopped SSH Honeypot`);
        })
    }

}

module.exports = {
    SSHHoneypot
}