const httpOutArray = [];
for (const f of ['log','warn','error','debug']) {
    console['_'+f] = console[f];
    console[f] = (...args) => {
        while (httpOutArray.length >= 200) httpOutArray.shift();
        httpOutArray.push(args.map(i => String(i)).join(' '));
        return console['_'+f](...args);
    };
}

const {bump} = require('./puppeteer.js');
//require('dotenv').config();

console.log('Starting bumper...');
let counter = 1500;

async function run() {
    const c = ++counter;
    console.log('Starting bump #' + c + ' @ ' + String(new Date()));
    try {
        await bump();
    } catch (error) {
        console.error(error);
    }
    console.log('Finished bump #' + c + ' @ ' + String(new Date()) + '\n');
}

setInterval(run, 1000 * 60 * 60);
run();

var http = require('http');
http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Nr. of bumps: '+counter+'\n\n'+httpOutArray.join('\n'));
}).listen(80, '0.0.0.0');
