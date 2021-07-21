// Config
const serverKey = '';
const serverPort = 5037;
const amiPort = 5038;
const amiHost = '';
const amiLogin = '';
const amiPassword = '';
const bxConfig = {
    'inHookUrl': '',
    'outHookKey': '',
};
const callsConfig = {
    'cacheFolder': './calls/',
    'recordsFolder': '/data/records/',
    'recordsUrl': '',
};

// Init
const libUrl = require('url');
const libHttp = require('http');
const libAmi = require('asterisk-ami-client');
const libFunctions = require('./functions');

// Start
console.log('Started');
let amiClient = new libAmi();
functions = new libFunctions(bxConfig, callsConfig);

// Ami
amiClient.connect(amiLogin, amiPassword, {host: amiHost, port: amiPort})
    .then(amiConnection => {

        amiClient
            .on('connect', () => console.log('AMI connected!'))
            .on('internalError', error => console.log('AMI internal error: ' + error))
            .on('event', objEvent => {
                //console.log(objEvent);
                try {
                    if (objEvent.Event == 'DialBegin') {
                        functions.dialBegin(objEvent);
                    }
                    if (objEvent.Event == 'Hangup') {
                        functions.hangup(objEvent);
                    }
                } catch (err) {
                    console.log('AMI error: ' + err);
                }
            });

    })
    .catch(error => {
        console.log('AMI error: ' + error);
    });

// Web
const requestHandler = (req, res) => {
    try {
        var url = libUrl.parse(req.url, true);
        if (url.query.key === serverKey) {
            res.end('BX integration server, hello!');
            console.log('Ressieving comand');
            console.log(url.query);
        } else {
            res.end('No access');
            console.log('No access connection');
        }
    } catch (err) {
        console.log('Server error: ' + err);
    }
};
const server = libHttp.createServer(requestHandler);
server.listen(serverPort, (err) => {
    if (err) {
        return console.log('Asterisk-BX integration server error: ', err);
    }
    console.log(`Asterisk-BX integration server listening on ${serverPort}`);
});