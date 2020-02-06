const readLine = require('readline');
const fs = require('fs');

const rl = readLine.createInterface({
    input: process.stdin,
    output: process.stdout
});

let omit = false;

rl._writeToOutput = message => {
    rl.output.write(omit && message.length === 1 ? '*' : message);
}

function askYesNo(message, defaultAnswer) {
    return new Promise((resolve, reject) => {
        let display = defaultAnswer ? ' [Y/n]' : ' [y/N]';
        rl.question(`${message}${display}: `, answer => {
            resolve(answer.length > 0 ? answer.toLowerCase() === 'y' : defaultAnswer);
        });
    });
}

function askPath(message, defaultPath) {
    return new Promise((resolve, reject) => {
        rl.question(`${message}${defaultPath ? ` [${defaultPath}]` : `` }: `, answer => {
            resolve(answer.length > 0 ? answer : defaultPath);
        });
    });
}

function askNumber(message, defaultNumber) {
    return new Promise((resolve, reject) => {
        rl.question(`${message} [${defaultNumber}]: `, answer => {
            resolve(answer.length > 0 ? answer : defaultNumber);
        });
    });
}

function askString(message) {
    return new Promise((resolve, reject) => {
        rl.question(message, answer => {
            resolve(answer);
        });
    });
}


(async function setup() {

    let config = JSON.parse(fs.readFileSync('./config.json'));
    
    let correct = false;
    let password = "";

    do {

        const port = await askNumber('On which port should the web service listen on?', 5400);
        config.webService.port = port;

        const useSSL = await askYesNo('Do you want to use SSL?', true);
        config.webService.ssl.enabled = useSSL;

        if (useSSL) {
            let keyFile;

            do {
                keyFile = await askPath('Where is the private key located?', './ssl/key.pem');
                if (!fs.existsSync(keyFile)) {
                    console.log('The specified private key does not exist');
                }
            } while(!fs.existsSync(keyFile));
            config.webService.ssl.key = keyFile;

            let passphrase = await askPath('Enter the passphrase of the key [Empty for none]');
            config.webService.ssl.passphrase = passphrase;
            
            let certFile;

            do {
                certFile = await askPath('Where is the certificate file located? ', './ssl/cert.pem')
                if (!fs.existsSync(certFile)) {
                    console.log('The specified private key does not exist');
                }
            } while(!fs.existsSync(certFile));
            config.webService.ssl.cert = certFile;

        } else {
            config.webService.ssl.key = "";
            config.webService.ssl.cert = "";
            config.webService.ssl.passphrase = "";
        }

        const useAuth = await askYesNo('Do you want to use basic authentication?', true);
        config.webService.auth.enabled = useAuth;

        if (useAuth) {

            let username;

            do {
                username = await askString('Please enter a username: ');
            } while (!username || username.length === 0);
            config.webService.auth.username = username;


            omit = true;

            do {
                password = await askString('Please enter a password: '); 
            } while (!password || password.length === 0);
            config.webService.auth.password = '*'.repeat(password.length);;
            omit = false;

        } else {
            config.webService.auth.username = "";
            config.webService.auth.password = "";
        }
        
        console.log(JSON.stringify(config.webService, null, 2));
        correct = await askYesNo('Is this config correct?', true);

    } while (!correct);

    config.webService.auth.password = password;

    fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

    rl.close();



})();

